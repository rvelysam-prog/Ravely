import React, { useState, useEffect } from 'react';
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Trash2,
  Eye,
  FileText,
  Server,
  ShieldCheck
} from 'lucide-react';
import {
  MailDeliveryState,
  MailLogDocument,
  OFFICIAL_DEPARTMENTS,
  OFFICIAL_SENDER_EMAIL,
  deleteMailLogFromFirestore,
  fetchMailLogsFromFirestore,
   retryMailDocumentInFirestore,
  sendCandidatureAcceptanceEmailViaFirebase,
  subscribeToMailLogsFirestore
} from '../services/departmentsAndEmailService';
import {
  formatPromesseDateLongFr,
  formatPromesseDateSlash,
  generatePromesseEmbauchePdfDataUri
} from '../services/promesseEmbauchePdfGenerator';

export const EmailLogsSection: React.FC = () => {
  const [logs, setLogs] = useState<MailLogDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stateFilter, setStateFilter] = useState<'ALL' | MailDeliveryState>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Test Gmail form state (Point 5)
  const [testGmail, setTestGmail] = useState<string>('rvelysam@gmail.com');
  const [testNom, setTestNom] = useState<string>('SALIMATA TRAORER');
  const [testPoste, setTestPoste] = useState<string>('Préparatrice de Commande');
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToMailLogsFirestore(
      (liveLogs) => {
        setLogs(liveLogs);
        setLoading(false);
      },
      (errMsg) => {
        setFeedback({ type: 'error', text: errMsg });
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      const fresh = await fetchMailLogsFromFirestore();
      setLogs(fresh);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testGmail.trim() || !testGmail.includes('@')) {
      setFeedback({
        type: 'error',
        text: 'Veuillez saisir une adresse email Gmail valide.'
      });
      return;
    }

    setSendingTest(true);
    setFeedback(null);

    try {
      const testMatricule = `EMP-2026-TEST${Math.floor(100 + Math.random() * 899)}`;
      const todayIso = new Date().toISOString().slice(0, 10);

      // Generate real 2-page PDF Promesse d'Embauche in base64
      const pdfDataUri = await generatePromesseEmbauchePdfDataUri({
        nom_complet: testNom.trim().toUpperCase(),
        date_naissance: '1994-06-15',
        sexe: 'Féminin',
        nationalite: 'Canadienne',
        numero_piece_identite: 'C01294857',
        telephone: '+1 (506) 802-2226',
        email: testGmail.trim(),
        adresse: 'Surrey, Colombie-Britanique, Canada',
        contact_urgence: 'Contact Urgence (+1 506 802-2226)',
        poste: testPoste.trim(),
        departement: OFFICIAL_DEPARTMENTS[1].name,
        manager: 'ANTOINE FORESTIN',
        matricule: testMatricule,
        type_contrat: 'Contrat à Durée Déterminée (CDI) de 2 ans',
        date_embauche: '2027-01-04',
        date_etablissement: todayIso,
        salaire_horaire: '22',
        lieu_travail: 'Surrey, Colombie-Britanique, Canada',
        horaire: 'Temps plein – 40 heures par semaine',
        ni: 'BC1129970',
        responsabilites: OFFICIAL_DEPARTMENTS[1].missions
      });

      const result = await sendCandidatureAcceptanceEmailViaFirebase({
        toEmail: testGmail.trim(),
        nomComplet: testNom.trim().toUpperCase(),
        civilite: 'Madame',
        poste: testPoste.trim(),
        departement: OFFICIAL_DEPARTMENTS[1].name,
        dateEmbauche: formatPromesseDateLongFr('2027-01-04'),
        dateEtablissement: formatPromesseDateSlash(todayIso),
        matricule: testMatricule,
        pdfDataUri
      });

      await handleManualRefresh();

      if (result.deliveryState === 'SUCCESS') {
        setFeedback({
          type: 'success',
          text: `Email de test envoyé avec succès à ${testGmail.trim()} (ID doc mail : ${result.mailDocId}, delivery.state = SUCCESS). Pensez à vérifier le dossier Spams / Courrier indésirable de Gmail.`
        });
      } else if (result.deliveryState === 'PENDING') {
        setFeedback({
          type: 'warning',
          text: `Document créé dans la collection Firestore « mail » (ID : ${result.mailDocId}, to: ["${testGmail.trim()}"], from: "${OFFICIAL_SENDER_EMAIL}") avec le PDF en base64. État actuel : delivery.state = PENDING. Si l'email n'arrive pas dans la boîte de réception ou les Spams Gmail, vérifiez la configuration SMTP (mail.infomaniak.com) / SendGrid de l'extension Trigger Email ci-dessous.`
        });
      } else {
        setFeedback({
          type: 'error',
          text: `Échec lors du traitement de l'email (ID : ${result.mailDocId}, delivery.state = ERROR) : ${result.emailError}`
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleRetryMail = async (log: MailLogDocument) => {
    setRetryingId(log.id);
    try {
      await retryMailDocumentInFirestore(log);
      await handleManualRefresh();
      setFeedback({
        type: 'success',
        text: `Document mail ${log.id} relancé (delivery.state remis à PENDING pour retraitement par Trigger Email).`
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setRetryingId(null);
    }
  };

  const handleDeleteLog = async (id: string) => {
    await deleteMailLogFromFirestore(id);
    setLogs((prev) => prev.filter((item) => item.id !== id));
  };

  const filteredLogs = logs.filter((item) => {
    const itemState = item.delivery?.state || 'PENDING';
    if (stateFilter !== 'ALL' && itemState !== stateFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.to.some((t) => t.toLowerCase().includes(q)) ||
      (item.nom_complet || '').toLowerCase().includes(q) ||
      (item.matricule || '').toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    );
  });

  const countSuccess = logs.filter((l) => l.delivery?.state === 'SUCCESS').length;
  const countPending = logs.filter(
    (l) => !l.delivery?.state || l.delivery.state === 'PENDING' || l.delivery.state === 'PROCESSING'
  ).length;
  const countError = logs.filter((l) => l.delivery?.state === 'ERROR').length;

  const renderStateBadge = (state?: MailDeliveryState) => {
    const resolved = state || 'PENDING';
    if (resolved === 'SUCCESS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>SUCCESS</span>
        </span>
      );
    }
    if (resolved === 'ERROR') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-red-100 text-red-800 border border-red-300">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          <span>ERROR</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        <span>{resolved}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Diagnostic de la collection Firestore "mail" */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#0B2545] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md font-semibold">
              <Server className="w-3.5 h-3.5 text-blue-700" />
              <span>Firebase Extension Trigger Email · Collection « mail »</span>
            </div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0B2545]">
              Logs Emails &amp; Suivi de Livraison (<code className="font-mono text-base">delivery.state</code>)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Surveillance en temps réel de la collection Firestore <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">mail</code> : statut <strong className="text-amber-700">PENDING</strong> / <strong className="text-emerald-700">SUCCESS</strong> / <strong className="text-red-700">ERROR</strong>, vérification des pièces jointes PDF en base64 et diagnostic SMTP (<code className="font-mono">atlantictransport.int@ik.me</code>).
            </p>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 inline-flex items-center gap-2 self-start lg:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser la collection « mail »</span>
          </button>
        </div>

        {/* Compteurs d'état delivery.state */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block">Total documents « mail »</span>
            <span className="text-2xl font-display font-bold text-[#0B2545]">{logs.length}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-xs text-emerald-800 font-semibold block">
              delivery.state : SUCCESS
            </span>
            <span className="text-2xl font-display font-bold text-emerald-700">
              {countSuccess}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
            <span className="text-xs text-amber-900 font-semibold block">
              delivery.state : PENDING
            </span>
            <span className="text-2xl font-display font-bold text-amber-700">
              {countPending}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200">
            <span className="text-xs text-red-800 font-semibold block">
              delivery.state : ERROR
            </span>
            <span className="text-2xl font-display font-bold text-red-700">{countError}</span>
          </div>
        </div>

        {/* Vérification des paramètres de l'extension Trigger Email & SMTP ik.me / SendGrid */}
        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <ShieldCheck className="w-4 h-4" />
              <span>
                Diagnostic Configuration Firebase Extension « Trigger Email (firestore-send-email) »
              </span>
            </div>
            <span className="font-mono text-[11px] text-emerald-400">
              Règles Firestore /mail/&#123;mailId&#125; : Autorisées (Admin RH)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px] font-mono text-slate-300">
            <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
              <span className="text-slate-400 block">1. Collection &amp; Schéma :</span>
              <span className="text-white font-semibold">
                Collection : mail | to: [email] | message.subject | message.html | message.attachments (Base64)
              </span>
            </div>
            <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
              <span className="text-slate-400 block">2. Expéditeur &amp; Base Firestore :</span>
              <span className="text-white font-semibold">
                from : {OFFICIAL_SENDER_EMAIL}
                <br />
                DB : ai-studio-atlantictranspor-cd8ee793...
              </span>
            </div>
            <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
              <span className="text-slate-400 block">3. Paramètres SMTP ik.me / SendGrid :</span>
              <span className="text-amber-300 font-semibold">
                Serveur SMTP ik.me : mail.infomaniak.com (Port 465 SSL ou 587 TLS) ou SendGrid (smtp.sendgrid.net)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Point 5 : Outil de Test d'envoi vers une adresse Gmail */}
      <form
        onSubmit={handleSendTestGmail}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[#0B2545]" />
            <h3 className="font-display font-bold text-base text-[#0B2545]">
              Tester l&apos;envoi vers une adresse Gmail (avec Promesse d&apos;Embauche PDF en Base64)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Expéditeur : <strong className="font-mono text-slate-800">{OFFICIAL_SENDER_EMAIL}</strong> (Vérifiez aussi l&apos;onglet Spams / Promotions de Gmail)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adresse Gmail destinataire (<code className="font-mono">to: [email]</code>) *
            </label>
            <input
              type="email"
              required
              value={testGmail}
              onChange={(e) => setTestGmail(e.target.value)}
              placeholder="exemple@gmail.com"
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nom du salarié (Test)
            </label>
            <input
              type="text"
              required
              value={testNom}
              onChange={(e) => setTestNom(e.target.value)}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm uppercase font-semibold"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Poste (Test)
            </label>
            <input
              type="text"
              required
              value={testPoste}
              onChange={(e) => setTestPoste(e.target.value)}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={sendingTest}
              className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Mail className="w-4 h-4 text-amber-400" />
              <span>{sendingTest ? 'Envoi...' : 'Tester Gmail'}</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : feedback.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">{feedback.text}</div>
          </div>
        )}
      </form>

      {/* Liste des documents de la collection "mail" */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'PENDING', 'SUCCESS', 'ERROR'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStateFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors ${
                  stateFilter === st
                    ? 'bg-[#0B2545] text-white border-[#0B2545]'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {st === 'ALL' ? `TOUS (${logs.length})` : st}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par email, salarié, matricule ou ID..."
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs sm:text-sm w-full sm:w-72"
          />
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl">
            Aucun log d&apos;email trouvé dans la collection <code className="font-mono">mail</code> pour ce filtre.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const delivState = log.delivery?.state || 'PENDING';
              const errorDetail = log.delivery?.error || log.emailError || '';
              const att = log.message?.attachments?.[0];
              const isExpanded = expandedLogId === log.id;

              return (
                <div
                  key={log.id}
                  className={`rounded-xl border p-4 space-y-3 transition-all ${
                    delivState === 'ERROR'
                      ? 'border-red-300 bg-red-50/30'
                      : delivState === 'SUCCESS'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderStateBadge(delivState)}
                        <span className="text-xs font-mono font-bold text-[#0B2545]">
                          ID: {log.id}
                        </span>
                        {log.matricule && (
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[11px] font-mono font-semibold">
                            {log.matricule}
                          </span>
                        )}
                        {log.nom_complet && (
                          <span className="text-xs font-bold text-slate-800">
                            {log.nom_complet}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>
                          <strong>De (from) :</strong>{' '}
                          <code className="font-mono text-slate-900">{log.from}</code>
                        </span>
                        <span>
                          <strong>À (to) :</strong>{' '}
                          <code className="font-mono text-blue-800 font-bold">
                            [{log.to.map((x) => `"${x}"`).join(', ')}]
                          </code>
                        </span>
                        <span>
                          <strong>Date :</strong>{' '}
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 flex flex-wrap items-center gap-3">
                        <span>
                          <strong>Sujet :</strong> {log.message?.subject}
                        </span>
                        {att && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-mono">
                            <FileText className="w-3 h-3" />
                            <span>
                              {att.filename} ({att.encoding || 'base64'}
                              {att.sizeKb ? ` · ~${att.sizeKb} Ko` : ''})
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isExpanded ? 'Masquer détail' : 'Aperçu HTML & JSON'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={retryingId === log.id}
                        onClick={() => handleRetryMail(log)}
                        className="px-3 py-1.5 rounded-lg bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${retryingId === log.id ? 'animate-spin' : ''}`}
                        />
                        <span>Relancer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteLog(log.id)}
                        title="Supprimer ce log"
                        className="p-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Affichage de l'erreur ou du diagnostic si échec ou en attente prolongée */}
                  {errorDetail && (
                    <div
                      className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2 ${
                        delivState === 'ERROR'
                          ? 'bg-red-100/80 border-red-300 text-red-900'
                          : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>
                          {delivState === 'ERROR'
                            ? 'Erreur delivery.error :'
                            : 'Diagnostic delivery.state (PENDING) :'}
                        </strong>{' '}
                        {errorDetail}
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <span className="text-xs font-bold text-[#0B2545] block">
                          Aperçu de message.html :
                        </span>
                        <div
                          className="text-xs border border-slate-100 p-3 rounded-lg bg-slate-50/50 overflow-auto max-h-64"
                          dangerouslySetInnerHTML={{
                            __html: log.message?.html || '<p>Aucun contenu HTML</p>'
                          }}
                        />
                      </div>

                      <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl space-y-2 font-mono text-[11px] overflow-auto max-h-64">
                        <span className="text-amber-400 font-bold block">
                          Structure du document Firestore « mail/{log.id} » :
                        </span>
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(
                            {
                              to: log.to,
                              from: log.from,
                              replyTo: log.replyTo,
                              matricule: log.matricule,
                              emailEnvoye: log.emailEnvoye,
                              emailError: log.emailError || null,
                              delivery: log.delivery,
                              message: {
                                subject: log.message?.subject,
                                attachments: (log.message?.attachments || []).map((a) => ({
                                  filename: a.filename,
                                  encoding: a.encoding,
                                  contentType: a.contentType,
                                  sizeKb: a.sizeKb
                                }))
                              }
                            },
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
