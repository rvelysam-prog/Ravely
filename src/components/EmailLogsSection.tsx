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
  ShieldCheck,
  Key
} from 'lucide-react';
import {
  MailDeliveryState,
  MailLogDocument,
  OFFICIAL_DEPARTMENTS,
  OFFICIAL_SENDER_EMAIL,
  deleteMailLogFromFirestore,
  fetchMailLogsFromFirestore,
  retryMailDocumentInFirestore,
  subscribeToMailLogsFirestore
} from '../services/departmentsAndEmailService';
import {
  formatPromesseDateLongFr,
  formatPromesseDateSlash,
  generatePromesseEmbauchePdfDataUri
} from '../services/promesseEmbauchePdfGenerator';
import {
  sendPromesseEmbaucheViaEmailJs,
  getLocalEmailJsLogs,
  EmailJsSendResult
} from '../services/emailjsService';
import {
  EMAILJS_PUBLIC_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  EMAILJS_SENDER_EMAIL,
  INFOMANIAK_SMTP_SETTINGS,
  getEmailJsConfig,
  EmailJsConfig
} from '../config/emailjsConfig';
import { EmailJsConfigModal } from './EmailJsConfigModal';

export const EmailLogsSection: React.FC = () => {
  const [logs, setLogs] = useState<MailLogDocument[]>([]);
  const [emailJsLogs, setEmailJsLogs] = useState<EmailJsSendResult[]>(() => getLocalEmailJsLogs());
  const [loading, setLoading] = useState<boolean>(true);
  const [stateFilter, setStateFilter] = useState<'ALL' | MailDeliveryState>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [currentConfig, setCurrentConfig] = useState<EmailJsConfig>(() => getEmailJsConfig());

  // Test Gmail form state
  const [testGmail, setTestGmail] = useState<string>('rvelysam@gmail.com');
  const [testNom, setTestNom] = useState<string>('SALIMATA TRAORER');
  const [testPoste, setTestPoste] = useState<string>('Préparatrice de Commande');
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
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
      setEmailJsLogs(getLocalEmailJsLogs());
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
    // Affiche "Envoi en cours..."
    setFeedback({
      type: 'info',
      text: 'Envoi en cours...'
    });

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
        telephone: '+15068022206',
        email: testGmail.trim(),
        adresse: 'Surrey, Colombie-Britanique, Canada',
        contact_urgence: 'Contact Urgence (+15068022206)',
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

      // 100% EmailJS frontend sans Firebase Trigger Email / sans SendGrid / sans forfait payant Blaze
      const result = await sendPromesseEmbaucheViaEmailJs({
        candidateEmail: testGmail.trim(),
        candidateName: testNom.trim().toUpperCase(),
        poste: testPoste.trim(),
        date: formatPromesseDateSlash(todayIso),
        matricule: testMatricule,
        departement: OFFICIAL_DEPARTMENTS[1].name,
        dateEmbauche: formatPromesseDateLongFr('2027-01-04'),
        pdfDataUri
      });

      setEmailJsLogs(getLocalEmailJsLogs());

      if (result.success) {
        setFeedback({
          type: 'success',
          text: `Email envoyé avec succès via ${EMAILJS_SENDER_EMAIL}`
        });
      } else {
        setFeedback({
          type: 'error',
          text: `Erreur d’envoi via ${EMAILJS_SENDER_EMAIL} : ${result.error || result.statusText || 'Échec de transmission EmailJS'}`
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: `Erreur d’envoi via ${EMAILJS_SENDER_EMAIL} : ${err instanceof Error ? err.message : String(err)}`
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
              <span>Solution 100% EmailJS Frontend Gratuit · SMTP Infomaniak</span>
            </div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0B2545]">
              Suivi des Envois &amp; Configuration EmailJS
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Envoi automatique direct depuis le frontend via EmailJS (<code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">emailjs-com</code>) sans dépendance à Firebase Trigger Email, sans SendGrid et sans abonnement payant Blaze. Expéditeur officiel : <strong className="text-[#0B2545] font-mono">{EMAILJS_SENDER_EMAIL}</strong> (connecté à Infomaniak <code className="font-mono">{INFOMANIAK_SMTP_SETTINGS.host}:{INFOMANIAK_SMTP_SETTINGS.port}</code>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <Key className="w-4 h-4" />
              <span>Configurer EmailJS</span>
            </button>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Compteurs d'état delivery.state */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block">Total documents « mail »</span>
            <span className="text-2xl font-display font-bold text-[#0B2545]">{logs.length}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-xs text-emerald-800 font-semibold block">
              Envois réussis
            </span>
            <span className="text-2xl font-display font-bold text-emerald-700">
              {countSuccess + emailJsLogs.filter((l) => l.success).length}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
            <span className="text-xs text-amber-900 font-semibold block">
              En cours / PENDING
            </span>
            <span className="text-2xl font-display font-bold text-amber-700">
              {countPending}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200">
            <span className="text-xs text-red-800 font-semibold block">
              Erreurs signalées
            </span>
            <span className="text-2xl font-display font-bold text-red-700">{countError}</span>
          </div>
        </div>

        {/* Diagnostic Configuration 100% EmailJS & SMTP Infomaniak */}
        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <ShieldCheck className="w-4 h-4" />
              <span>
                Diagnostic EmailJS 100% Client-Side (Sans SendGrid / Sans Firebase Trigger Email / Sans Blaze)
              </span>
            </div>
            <span className="font-mono text-[11px] text-emerald-400">
              Statut : Actif (Client Frontend)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px] font-mono text-slate-300">
            <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
              <span className="text-slate-400 block">1. Variables de Template EmailJS :</span>
              <span className="text-white font-semibold">
                Template ID : {currentConfig.templateId}
                <br />
                Vars : &#123;&#123;nom_complet&#125;&#125;, &#123;&#123;matricule&#125;&#125;, &#123;&#123;poste&#125;&#125;, &#123;&#123;message_html&#125;&#125;, &#123;&#123;pdf_base64&#125;&#125;
              </span>
            </div>
            <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
              <span className="text-slate-400 block">2. Expéditeur Unique &amp; Identifiants :</span>
              <span className="text-white font-semibold">
                from_email : {EMAILJS_SENDER_EMAIL}
                <br />
                Service : {currentConfig.serviceId}
              </span>
            </div>
            <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
              <span className="text-slate-400 block">3. Serveur SMTP Infomaniak :</span>
              <span className="text-amber-300 font-semibold">
                Host : {INFOMANIAK_SMTP_SETTINGS.host} (Port {INFOMANIAK_SMTP_SETTINGS.port})
                <br />
                Compte : {INFOMANIAK_SMTP_SETTINGS.user}
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
              Tester l&apos;envoi automatique d&apos;une Promesse d&apos;Embauche (avec PDF Base64)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Expéditeur unique : <strong className="font-mono text-slate-800">{EMAILJS_SENDER_EMAIL}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adresse email destinataire (<code className="font-mono">to_email</code>) *
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
              className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <Mail className="w-4 h-4 text-amber-400" />
              <span>{sendingTest ? 'Envoi en cours...' : 'Tester l’envoi'}</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : feedback.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-950 font-medium animate-pulse'
                : feedback.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {feedback.type === 'info' ? (
              <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />
            ) : feedback.type === 'success' ? (
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

      <EmailJsConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => {
          setIsConfigModalOpen(false);
          setCurrentConfig(getEmailJsConfig());
        }}
      />
    </div>
  );
};
