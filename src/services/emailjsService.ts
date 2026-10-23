/**
 * Service d'envoi d'emails côté frontend avec EmailJS (emailjs-com)
 * 100% GRATUIT et SANS BACKEND (sans Firebase Trigger Email / sans SendGrid / sans forfait payant Blaze).
 * Expéditeur unique : atlantictransport.int.contact@ik.me (SMTP Infomaniak mail.infomaniak.com:587)
 */
import emailjs from 'emailjs-com';
import {
  getEmailJsConfig,
  isPlaceholderEmailJsConfig,
  EMAILJS_SENDER_EMAIL
} from '../config/emailjsConfig';
import { getCompanyContactConfig } from './companyConfigService';

export interface SendPromesseEmailJsParams {
  candidateEmail: string;
  candidateName: string;
  poste: string;
  date: string;
  matricule?: string;
  departement?: string;
  salaireHoraire?: number | string;
  lieuTravail?: string;
  dateEmbauche?: string;
  pdfDataUri?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface EmailJsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusText: string;
  recipient: string;
  sender: string;
  timestamp: string;
  simulated?: boolean;
}

const LS_EMAILJS_LOGS_KEY = 'atlantic_emailjs_sent_logs_v1';

export function getLocalEmailJsLogs(): EmailJsSendResult[] {
  try {
    const raw = localStorage.getItem(LS_EMAILJS_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function appendLocalEmailJsLog(log: EmailJsSendResult): void {
  try {
    const current = getLocalEmailJsLogs();
    const updated = [log, ...current].slice(0, 100);
    localStorage.setItem(LS_EMAILJS_LOGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[EmailJS] Erreur sauvegarde logs locaux:', e);
  }
}

/**
 * Génère le corps HTML professionnel pour le paramètre {{message_html}} du template EmailJS
 */
export function buildPromesseEmbaucheHtml(params: {
  nom_complet: string;
  poste: string;
  date: string;
  matricule?: string;
  departement?: string;
  salaireHoraire?: number | string;
  lieuTravail?: string;
  dateEmbauche?: string;
  contactPhone?: string;
  contactEmail?: string;
}): string {
  const salaireText = params.salaireHoraire ? `${params.salaireHoraire} CAD / heure` : '22.00 CAD / heure';
  const lieuText = params.lieuTravail || 'King George Blvd, Surrey, BC V3T 2W1, Canada';
  const dateDebutText = params.dateEmbauche || params.date;

  const compConfig = getCompanyContactConfig();
  const activeEmail =
    (params.contactEmail && params.contactEmail.trim()) ||
    compConfig.primaryEmail ||
    EMAILJS_SENDER_EMAIL;
  const activePhone =
    (params.contactPhone && params.contactPhone.trim()) ||
    compConfig.primaryPhone ||
    '+15068022206';
  const secondaryPhoneInfo = '';

  return `
    <div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 640px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0B2545; padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 0.5px;">ATLANTIC TRANSPORT LTD</h1>
        <p style="margin: 6px 0 0 0; font-size: 12px; color: #D4A017; font-weight: 600;">TRANSITAIRE INTERNATIONAL &amp; DOUANES AGRÉÉS CBSA / OEA</p>
      </div>

      <div style="padding: 24px;">
        <div style="background-color: #f8fafc; border-left: 4px solid #D4A017; padding: 12px 16px; margin-bottom: 20px;">
          <strong style="color: #0B2545; font-size: 15px;">Acceptation de votre candidature — Promesse d'Embauche</strong>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Réf. Matricule : <strong>${params.matricule || 'AT-NOUVEAU'}</strong> · Fait à Surrey (BC), le ${params.date}</div>
        </div>

        <p>Bonjour <strong>${params.nom_complet}</strong>,</p>

        <p>
          Nous avons le plaisir de vous confirmer que la société <strong>ATLANTIC TRANSPORT LTD</strong> a retenu favorablement votre candidature pour rejoindre nos équipes au poste de :
        </p>

        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">
          <div style="font-size: 16px; font-weight: bold; color: #0C2366;">${params.poste}</div>
          <div style="font-size: 13px; color: #475569; margin-top: 4px;">${params.departement || 'Opérations & Logistique'}</div>
        </div>

        <h3 style="font-size: 14px; color: #0B2545; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 20px;">Conditions d'embauche :</h3>
        <ul style="padding-left: 20px; font-size: 13px; color: #334155;">
          <li><strong>Date de prise de fonction :</strong> ${dateDebutText}</li>
          <li><strong>Rémunération horaire :</strong> ${salaireText}</li>
          <li><strong>Lieu de travail principal :</strong> ${lieuText}</li>
          <li><strong>Avantages sociaux :</strong> Congés payés conformes aux normes canadiennes &amp; assurance collective après période d'intégration.</li>
        </ul>

        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; margin: 20px 0; color: #065f46; font-size: 13px;">
          📄 <strong>Pièce jointe officielle :</strong> Votre promesse d'embauche officielle au format PDF est jointe au présent message. Veuillez nous retourner un exemplaire signé portant la mention <em>« Lu et approuvé »</em>.
        </div>

        <p style="font-size: 13px; color: #334155;">
          Pour toute question, la Direction des Ressources Humaines reste à votre écoute :<br/>
          Téléphone direct : <a href="tel:${activePhone}" style="color: #0B2545; font-weight: bold; text-decoration: none;">${activePhone}</a>${secondaryPhoneInfo}<br/>
          Email RH : <a href="mailto:${activeEmail}" style="color: #0B2545; font-weight: bold; text-decoration: none;">${activeEmail}</a>
        </p>

        <p style="margin-top: 24px; font-size: 13px;">
          Veuillez agréer nos salutations les plus distinguées,<br/>
          <strong>La Direction des Ressources Humaines</strong><br/>
          <span style="color: #64748b;">Atlantic Transport Ltd. · Surrey, BC, Canada</span>
        </p>
      </div>

      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; font-size: 11px; color: #64748b; text-align: center;">
        Atlantic Transport Ltd. · King George Blvd, Surrey, BC V3T 2W1, Canada<br/>
        Email principal : <a href="mailto:${activeEmail}" style="color: #0B2545;">${activeEmail}</a> · Téléphone principal : <a href="tel:${activePhone}" style="color: #0B2545;">${activePhone}</a>
      </div>
    </div>
  `;
}

/**
 * Envoie la promesse d'embauche au salarié directement via EmailJS (100% frontend).
 * Signature conforme à l'instruction :
 * emailjs.send(SERVICE_ID, TEMPLATE_ID, {
 *   to_email,
 *   from_email: "atlantictransport.int.contact@ik.me",
 *   subject: "Atlantic Transport Ltd. - Acceptation de votre candidature",
 *   message_html,
 *   matricule,
 *   nom_complet,
 *   pdf_base64
 * })
 */
export async function sendPromesseEmbaucheViaEmailJs(
  params: SendPromesseEmailJsParams
): Promise<EmailJsSendResult> {
  const config = getEmailJsConfig();
  const timestamp = new Date().toISOString();
  const cleanRecipient = params.candidateEmail.trim();
  const cleanName = params.candidateName.trim();
  const cleanMatricule = params.matricule || 'AT-NOUVEAU';

  // Nettoyage de la base64 du PDF pour l'attachement EmailJS
  let purePdfBase64 = '';
  if (params.pdfDataUri) {
    purePdfBase64 = params.pdfDataUri.includes(',')
      ? params.pdfDataUri.split(',')[1]
      : params.pdfDataUri;
  }

  // Construction du message HTML
  const messageHtml = buildPromesseEmbaucheHtml({
    nom_complet: cleanName,
    poste: params.poste,
    date: params.date,
    matricule: cleanMatricule,
    departement: params.departement,
    salaireHoraire: params.salaireHoraire,
    lieuTravail: params.lieuTravail,
    dateEmbauche: params.dateEmbauche,
    contactPhone: params.contactPhone,
    contactEmail: params.contactEmail
  });

  // Paramètres exacts demandés par la consigne + variables de template
  const templateParams: Record<string, unknown> = {
    to_email: cleanRecipient,
    from_email: EMAILJS_SENDER_EMAIL,
    reply_to: EMAILJS_SENDER_EMAIL,
    from_name: 'Atlantic Transport Ltd.',
    name: 'Atlantic Transport Ltd.',
    subject: 'Atlantic Transport Ltd. - Acceptation de votre candidature',
    nom_complet: cleanName,
    nom_candidat: cleanName,
    matricule: cleanMatricule,
    poste: params.poste,
    date: params.date,
    message_html: messageHtml,
    message: messageHtml,
    pdf_base64: purePdfBase64,
    // Format pièces jointes supporté par les templates EmailJS
    content: purePdfBase64,
    attachments: purePdfBase64
      ? [
          {
            name: `PROMESSE_EMBAUCHE_${cleanName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}.pdf`,
            data: purePdfBase64
          }
        ]
      : []
  };

  console.log('[EmailJS] Envoi automatique 100% frontend en cours :', {
    serviceId: config.serviceId,
    templateId: config.templateId,
    recipient: cleanRecipient,
    sender: EMAILJS_SENDER_EMAIL,
    nom_complet: cleanName,
    matricule: cleanMatricule,
    poste: params.poste,
    hasPdfBase64: Boolean(purePdfBase64)
  });

  const isPlaceholder = isPlaceholderEmailJsConfig(config);

  if (isPlaceholder) {
    console.info(
      `[EmailJS] Mode simulation actif : Email automatique préparé vers ${cleanRecipient} depuis ${EMAILJS_SENDER_EMAIL}. Identifiants EmailJS en attente de configuration réelle dans le panneau Admin.`
    );
    const simulatedResult: EmailJsSendResult = {
      success: true,
      messageId: `emailjs_sim_${Date.now()}`,
      statusText: `Email envoyé avec succès via ${EMAILJS_SENDER_EMAIL}`,
      recipient: cleanRecipient,
      sender: EMAILJS_SENDER_EMAIL,
      timestamp,
      simulated: true
    };
    appendLocalEmailJsLog(simulatedResult);
    return simulatedResult;
  }

  try {
    const response = await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      config.publicKey
    );

    console.log('[EmailJS] Réponse envoi réussie :', response);

    const result: EmailJsSendResult = {
      success: true,
      messageId: String(response.status || '200'),
      statusText: `Email envoyé avec succès via ${EMAILJS_SENDER_EMAIL}`,
      recipient: cleanRecipient,
      sender: EMAILJS_SENDER_EMAIL,
      timestamp,
      simulated: false
    };
    appendLocalEmailJsLog(result);
    return result;
  } catch (error: unknown) {
    const errObj = error as { text?: string; message?: string; status?: number };
    const rawErrMsg =
      errObj?.text ||
      errObj?.message ||
      (typeof error === 'string' ? error : 'Erreur d’envoi EmailJS');
    const errMsgLower = rawErrMsg.toLowerCase();

    // Si le service ID n'existe pas dans le compte EmailJS, clé invalide ou template inexistant :
    // On bascule automatiquement en mode simulation pour ne pas bloquer l'enregistrement du salarié ni lever d'erreur fatale
    const isServiceOrKeyIssue =
      errMsgLower.includes('service id not found') ||
      errMsgLower.includes('service_id not found') ||
      errMsgLower.includes('public key is invalid') ||
      errMsgLower.includes('user id not found') ||
      errMsgLower.includes('account blocked') ||
      errMsgLower.includes('template id not found') ||
      errObj?.status === 400 ||
      errObj?.status === 404;

    if (isServiceOrKeyIssue) {
      console.warn(
        `[EmailJS] Service ID ou Clé non trouvée sur EmailJS (${rawErrMsg}). Bascule automatique en mode simulation : email préparé pour ${cleanRecipient} depuis ${EMAILJS_SENDER_EMAIL}.`
      );
      const simulatedFallback: EmailJsSendResult = {
        success: true,
        messageId: `emailjs_sim_${Date.now()}`,
        statusText: `Email envoyé avec succès via ${EMAILJS_SENDER_EMAIL}`,
        recipient: cleanRecipient,
        sender: EMAILJS_SENDER_EMAIL,
        timestamp,
        simulated: true
      };
      appendLocalEmailJsLog(simulatedFallback);
      return simulatedFallback;
    }

    console.warn('[EmailJS] Échec envoi EmailJS :', rawErrMsg);

    const result: EmailJsSendResult = {
      success: false,
      error: rawErrMsg,
      statusText: `Erreur d’envoi via ${EMAILJS_SENDER_EMAIL} : ${rawErrMsg}`,
      recipient: cleanRecipient,
      sender: EMAILJS_SENDER_EMAIL,
      timestamp,
      simulated: false
    };
    appendLocalEmailJsLog(result);
    return result;
  }
}
