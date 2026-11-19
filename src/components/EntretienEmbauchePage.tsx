import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  Phone,
  QrCode,
  ArrowLeft,
  Download
} from 'lucide-react';
import { SiteSettings, PublicPage } from '../types';
import {
  TicketEntretienData,
  getInterviewSessionByCode,
  markInterviewCompleted,
  generateTicketEntretienPdf
} from '../services/contractGenerationService';
import {
  ActionButton,
  MetadataRow,
  SectionHeader,
  StatusNotice,
  SurfaceCard
} from './ui/DesignSystem';

interface EntretienEmbauchePageProps {
  settings: SiteSettings;
  onNavigate: (page: PublicPage) => void;
  initialCode?: string;
}

interface ChatMessage {
  id: string;
  sender: 'recruiter' | 'candidate';
  senderName: string;
  text: string;
  timestamp: string;
}

export const EntretienEmbauchePage: React.FC<EntretienEmbauchePageProps> = ({
  settings,
  onNavigate,
  initialCode
}) => {
  // Extraction du code depuis l'URL ou props
  const [codeInput, setCodeInput] = useState<string>(() => {
    if (initialCode) return initialCode;
    try {
      const params = new URLSearchParams(window.location.search);
      const qCode = params.get('code') || params.get('candidature') || params.get('ticket');
      if (qCode) return qCode.trim().toUpperCase();
      const hashMatch = window.location.hash.match(/[?&]code=([a-zA-Z0-9_-]+)/i);
      if (hashMatch) return hashMatch[1].toUpperCase();
    } catch {
      // Ignore
    }
    return '';
  });

  const [session, setSession] = useState<TicketEntretienData | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-validation si un code est présent au chargement (scan du barcode ou URL directe)
  useEffect(() => {
    if (codeInput) {
      handleValidateCode(codeInput);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleValidateCode = (codeToTest: string) => {
    setIsVerifying(true);
    setCodeError(null);

    setTimeout(() => {
      const found = getInterviewSessionByCode(codeToTest);
      if (found) {
        if (found.estConsomme) {
          setCodeError(
            "Ce code d'entretien a déjà été utilisé et clôturé. Pour toute question, veuillez contacter les Ressources Humaines."
          );
          setSession(null);
        } else {
          setSession(found);
          setMessages([
            {
              id: 'msg_1',
              sender: 'recruiter',
              senderName: found.recruteurNom || 'Antoine Forestin (Direction RH)',
              text: `Bonjour ${found.candidatNom}, bienvenue à votre entretien d'embauche officiel pour le poste de ${found.posteConcerne} chez ${settings.company_name}. Je suis votre interlocuteur pour cet échange. Pouvez-vous me confirmer votre situation actuelle et votre disponibilité ?`,
              timestamp: new Date().toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
              })
            }
          ]);
        }
      } else {
        setCodeError(
          "Code ID Candidature invalide ou introuvable. Veuillez vérifier le code figurant sur votre Ticket d'entretien ou Contrat de prestation."
        );
        setSession(null);
      }
      setIsVerifying(false);
    }, 400);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !session || interviewFinished) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'candidate',
      senderName: session.candidatNom,
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Réponse intelligente simulée du recruteur RH
    setTimeout(() => {
      let replyText =
        "Merci pour ces précisions importantes. Vos compétences et votre parcours correspondent parfaitement à nos exigences pour nos opérations au Canada. Nous accordons une importance primordiale au respect des règles de sécurité et à la rigueur professionnelle.";

      const candidateTextLower = userMsg.text.toLowerCase();
      if (
        candidateTextLower.includes('permis') ||
        candidateTextLower.includes('classe 1') ||
        candidateTextLower.includes('conduire') ||
        candidateTextLower.includes('spl')
      ) {
        replyText =
          "C'est une excellente nouvelle concernant vos qualifications de conduite. Nos ensembles routiers sont récents et équipés des dernières technologies télématiques et ELD. Êtes-vous prêt à suivre notre session d'intégration à Surrey (Colombie-Britannique) ?";
      } else if (
        candidateTextLower.includes('salaire') ||
        candidateTextLower.includes('cad') ||
        candidateTextLower.includes('taux') ||
        candidateTextLower.includes('rémunération')
      ) {
        replyText =
          "Absolument. Comme stipulé sur notre fiche d'offre et notre contrat de prestation, les rémunérations respectent les normes d'emploi de la Colombie-Britannique (taux horaire attractif en $ CAD avec heures supp. à 150% et couverture santé/REER complète dès l'embauche).";
      } else if (
        candidateTextLower.includes('disponible') ||
        candidateTextLower.includes('délai') ||
        candidateTextLower.includes('immédiat') ||
        candidateTextLower.includes('mois')
      ) {
        replyText =
          "Très bien noté. Notre cabinet mandataire CRIC partenaire pilote l'ensemble des démarches d'immigration et d'EIMT auprès d'IRCC pour faciliter votre intégration dans les délais optimaux.";
      } else if (
        candidateTextLower.includes('logement') ||
        candidateTextLower.includes('hébergement') ||
        candidateTextLower.includes('surrey')
      ) {
        replyText =
          "Notre entreprise prévoit un accompagnement complet à l'installation avec possibilité d'aide à l'hébergement initial à Surrey pour faciliter votre arrivée au Canada en toute sérénité.";
      }

      const botMsg: ChatMessage = {
        id: `msg_bot_${Date.now()}`,
        sender: 'recruiter',
        senderName: session.recruteurNom || 'Antoine Forestin (Direction RH)',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 1200);
  };

  // Clôture de l'entretien
  const handleCompleteInterview = () => {
    if (!session) return;
    markInterviewCompleted(session.codeIdCandidature);
    setInterviewFinished(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_end_${Date.now()}`,
        sender: 'recruiter',
        senderName: 'Système Recrutement RH',
        text: "Votre entretien d'embauche officiel a été validé et enregistré par la Direction des Ressources Humaines. Un compte-rendu a été transmis à notre équipe et au cabinet mandataire CRIC. Vous recevrez la confirmation officielle par email.",
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    ]);
  };

  // Lien WhatsApp Business personnalisé avec le code candidature
  const buildWhatsAppLink = () => {
    if (!session) return '#';
    const cleanPhone = (settings.whatsapp || settings.phone || '15068022206').replace(/[^\d]/g, '');
    const prefilledText = encodeURIComponent(
      `Bonjour, je suis ${session.candidatNom}, candidat pour le poste de ${session.posteConcerne} (Réf Candidature : ${session.codeIdCandidature}). Je souhaite poursuivre mon entretien d'embauche officiel avec le personnel d'Atlantic Transport Ltd.`
    );
    return `https://wa.me/${cleanPhone}?text=${prefilledText}`;
  };

  return (
    <div className="min-h-screen bg-surface-canvas text-ink-primary pb-16">
      {/* En-tête de page */}
      <div className="bg-brand-navy text-white py-10 sm:py-12 border-b border-brand-gold/25 shadow-xs">
        <div className="ds-container flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-amber/20 border border-brand-amber/40 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6 text-brand-amber" aria-hidden="true" />
            </div>
            <SectionHeader
              as="h1"
              tone="dark"
              kicker="Espace Candidat Sécurisé · Recrutement Canada & International"
              title="Entretien d’Embauche Officiel"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('accueil')}
              className="ds-btn-base min-h-[44px] px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20"
            >
              <ArrowLeft className="w-4 h-4 text-brand-amber" aria-hidden="true" />
              <span>Retour à l&apos;accueil</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Connexion cryptée · Système RH Conforme</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ds-container mt-8">
        {!session ? (
          /* 1. ÉCRAN DE SÉCURITÉ : DEMANDE DU CODE ID CANDIDATURE */
          <SurfaceCard className="max-w-xl mx-auto shadow-lg space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-surface-subtle border border-surface-border text-brand-navy flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold text-ink-primary">
                Accès Sécurisé à votre Entretien
              </h2>
              <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed max-w-md mx-auto">
                Veuillez renseigner le <strong>CODE ID CANDIDATURE</strong> figurant sur votre{' '}
                <strong>Ticket d’Entretien d’Embauche</strong> ou sur votre{' '}
                <strong>Contrat de Prestation CRIC</strong>.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleValidateCode(codeInput);
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="candidate-code-input"
                  className="block text-xs font-bold text-ink-primary mb-1.5 uppercase tracking-wide"
                >
                  Code ID Candidature (Ex: ENT-ATL-8942-K9) *
                </label>
                <div className="relative">
                  <input
                    id="candidate-code-input"
                    type="text"
                    required
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="ENT-ATL-XXXX-XX"
                    className="ds-input min-h-[48px] pr-10 font-mono tabular-nums font-bold text-base tracking-wider text-brand-navy uppercase bg-surface-subtle focus:bg-white"
                  />
                  <ShieldCheck
                    className="w-5 h-5 text-ink-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {codeError && <StatusNotice variant="error">{codeError}</StatusNotice>}

              <ActionButton
                type="submit"
                variant="navy"
                fullWidth
                disabled={isVerifying || !codeInput.trim()}
                className="min-h-[48px]"
              >
                <span>{isVerifying ? 'Vérification en cours...' : 'Accéder à mon entretien'}</span>
                <ArrowRight className="w-4 h-4 text-brand-amber" aria-hidden="true" />
              </ActionButton>
            </form>

            {/* Aide et raccourci démo */}
            <div className="pt-4 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-secondary">
              <span className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
                <span>Le scan du code-barres sur votre ticket donne un accès direct sans saisie.</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setCodeInput('ENT-ATL-8942-K9');
                  handleValidateCode('ENT-ATL-8942-K9');
                }}
                className="min-h-[44px] px-2 text-brand-blue hover:underline font-bold whitespace-nowrap cursor-pointer"
              >
                Utiliser le code démo (ENT-ATL-8942-K9)
              </button>
            </div>
          </SurfaceCard>
        ) : (
          /* 2. ÉCRAN PRINCIPAL D'ENTRETIEN EN LIGNE DÉVERROUILLÉ */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Colonne Gauche : Détails du candidat, Poste et Actions */}
            <div className="lg:col-span-4 space-y-4">
              <SurfaceCard className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-surface-border pb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <ShieldCheck className="w-4 h-4 text-status-success" aria-hidden="true" />
                    <span>Session vérifiée</span>
                  </span>
                  <span className="font-mono tabular-nums text-xs text-ink-secondary font-bold">
                    {session.codeIdCandidature}
                  </span>
                </div>

                <div>
                  <div className="text-[11px] text-ink-muted uppercase font-bold">
                    Candidat convoqué :
                  </div>
                  <div className="text-base font-extrabold text-brand-navy mt-0.5">
                    {session.candidatNom}
                  </div>
                  <div className="text-xs text-ink-secondary break-all">{session.candidatEmail}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-subtle border border-surface-border space-y-2 text-xs">
                  <div>
                    <span className="text-ink-muted block text-[11px] uppercase font-bold">
                      Poste visé :
                    </span>
                    <span className="font-bold text-brand-navy-mid">{session.posteConcerne}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[11px] uppercase font-bold">
                      Classification CNP :
                    </span>
                    <span className="font-mono tabular-nums font-bold text-ink-primary">
                      Code CNP {session.codeCnp}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[11px] uppercase font-bold">
                      Recruteur RH :
                    </span>
                    <span className="font-semibold text-ink-primary">{session.recruteurNom}</span>
                  </div>
                </div>

                {/* BOUTON WHATSAPP BUSINESS DIRECT */}
                <div className="pt-1 space-y-1.5">
                  <a
                    href={buildWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ds-btn-base w-full min-h-[46px] bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs sm:text-sm shadow-xs"
                    title="Ouvrir une discussion directe avec l'équipe RH sur WhatsApp Business avec votre référence"
                  >
                    <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Continuer sur WhatsApp Business</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-85" aria-hidden="true" />
                  </a>
                  <span className="text-[11px] text-ink-secondary block text-center">
                    Discussion officielle avec le service recrutement d&apos;Atlantic Transport Ltd.
                  </span>
                </div>

                {/* Clôture de l'entretien */}
                {!interviewFinished ? (
                  <ActionButton
                    variant="secondary"
                    fullWidth
                    onClick={handleCompleteInterview}
                    className="text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-status-success" aria-hidden="true" />
                    <span>Clôturer cet entretien</span>
                  </ActionButton>
                ) : (
                  <StatusNotice variant="success" className="py-3">
                    Entretien d&apos;embauche clôturé
                  </StatusNotice>
                )}

                <ActionButton
                  variant="navy"
                  fullWidth
                  onClick={async () => {
                    try {
                      await generateTicketEntretienPdf(session);
                    } catch (err) {
                      console.error('Erreur téléchargement ticket:', err);
                    }
                  }}
                  className="text-xs"
                >
                  <Download className="w-4 h-4 text-brand-amber" aria-hidden="true" />
                  <span>Télécharger mon Ticket (PDF)</span>
                </ActionButton>
              </SurfaceCard>
            </div>

            {/* Colonne Droite : Messagerie interactive */}
            <SurfaceCard
              padded={false}
              className="lg:col-span-8 flex flex-col h-[520px] sm:h-[600px] lg:h-[640px] shadow-md overflow-hidden"
            >
              {/* Header du Chat */}
              <div className="bg-brand-navy text-white px-5 py-3.5 flex items-center justify-between gap-3 border-b border-brand-gold/25">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-amber/20 border border-brand-amber/40 flex items-center justify-center text-brand-amber font-bold text-xs shrink-0">
                    RH
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate">
                      {session.recruteurNom}
                    </div>
                    <MetadataRow
                      tone="dark"
                      className="text-[11px] text-emerald-300"
                      items={['En ligne', 'Recrutement & Mobilité Canada']}
                    />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono tabular-nums text-slate-300">
                    {session.codeIdCandidature}
                  </span>
                </div>
              </div>

              {/* Zone de messages */}
              <div
                aria-live="polite"
                className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 bg-surface-subtle text-xs sm:text-sm"
              >
                {messages.map((msg) => {
                  const isRecruiter = msg.sender === 'recruiter';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isRecruiter ? 'items-start' : 'items-end'}`}
                    >
                      <div className="text-[11px] text-ink-secondary mb-1 px-1 font-medium tabular-nums">
                        {msg.senderName} · {msg.timestamp}
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed shadow-2xs ${
                          isRecruiter
                            ? 'bg-white text-ink-primary border border-surface-border rounded-tl-xs'
                            : 'bg-brand-navy text-white rounded-tr-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-center gap-2 text-ink-secondary text-xs italic pl-2 pt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce [animation-delay:0.4s]" />
                    <span>{session.recruteurNom} est en train d&apos;écrire...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Champ d'envoi de message */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-surface-border flex items-center gap-2"
              >
                <label htmlFor="chat-reply-input" className="sr-only">
                  Réponse au recruteur
                </label>
                <input
                  id="chat-reply-input"
                  type="text"
                  disabled={interviewFinished}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    interviewFinished
                      ? "L'entretien est clôturé. Merci pour votre participation !"
                      : 'Saisissez votre réponse pour le recruteur...'
                  }
                  className="ds-input flex-1 bg-surface-subtle focus:bg-white disabled:opacity-60"
                />
                <ActionButton
                  type="submit"
                  variant="navy"
                  disabled={!inputText.trim() || interviewFinished}
                  className="text-xs sm:text-sm"
                >
                  <span>Envoyer</span>
                  <Send className="w-3.5 h-3.5 text-brand-amber" aria-hidden="true" />
                </ActionButton>
              </form>
            </SurfaceCard>
          </div>
        )}
      </div>
    </div>
  );
};
