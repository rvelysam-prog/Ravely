import React, { useState } from 'react';
import { X, Send, Key, CheckCircle2, AlertCircle, RefreshCw, Mail, ExternalLink } from 'lucide-react';
import {
  getEmailJsConfig,
  saveEmailJsConfig,
  EmailJsConfig,
  EMAILJS_SENDER_EMAIL
} from '../config/emailjsConfig';
import {
  sendPromesseEmbaucheViaEmailJs,
  getLocalEmailJsLogs,
  EmailJsSendResult
} from '../services/emailjsService';

interface EmailJsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailJsConfigModal: React.FC<EmailJsConfigModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<EmailJsConfig>(getEmailJsConfig());
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [logs, setLogs] = useState<EmailJsSendResult[]>(getLocalEmailJsLogs());

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveEmailJsConfig(config);
    setConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setTestStatus({ type: 'error', message: 'Veuillez saisir une adresse email de test valide.' });
      return;
    }
    setTesting(true);
    setTestStatus({ type: 'info', message: 'Envoi en cours...' });

    try {
      const res = await sendPromesseEmbaucheViaEmailJs({
        candidateEmail: testEmail,
        candidateName: 'Candidat Test',
        poste: 'Exploitant Transport',
        date: new Date().toLocaleDateString('fr-FR'),
        matricule: 'TEST-001',
        departement: 'DEPARTEMENT EXPLOITATION TRANSPORT',
        salaireHoraire: 24,
        dateEmbauche: '15/10/2026'
      });

      if (res.success) {
        setTestStatus({
          type: 'success',
          message: 'Email envoyé avec succès via atlantictransport.int.contact@ik.me'
        });
      } else {
        setTestStatus({
          type: 'error',
          message: `Erreur d’envoi via atlantictransport.int.contact@ik.me : ${res.error || 'Vérifiez vos clés et votre template EmailJS.'}`
        });
      }
      setLogs(getLocalEmailJsLogs());
    } catch (err: unknown) {
      setTestStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erreur imprévue lors du test.'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B2545] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base leading-tight">Configuration EmailJS (Frontend Direct)</h3>
              <p className="text-xs text-slate-300">
                Envoi automatique des promesses d&apos;embauche depuis {EMAILJS_SENDER_EMAIL}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-sm">
          {/* Info Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
            <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-amber-900">
              <span className="font-bold block">100% Frontend sans serveur requis :</span>
              EmailJS envoie directement le courrier au candidat depuis le navigateur. Les variables configurées
              dans le template <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300">promesse_embauche</code> sont :{' '}
              <strong className="font-mono text-amber-950">&#123;&#123;nom_candidat&#125;&#125;</strong>,{' '}
              <strong className="font-mono text-amber-950">&#123;&#123;poste&#125;&#125;</strong>,{' '}
              <strong className="font-mono text-amber-950">&#123;&#123;date&#125;&#125;</strong>.
            </div>
          </div>

          {/* Formulaire des 3 identifiants */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  EMAILJS_SERVICE_ID *
                </label>
                <input
                  type="text"
                  required
                  value={config.serviceId}
                  onChange={(e) => setConfig({ ...config, serviceId: e.target.value.trim() })}
                  placeholder="service_xxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:border-[#0B2545] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  EMAILJS_TEMPLATE_ID *
                </label>
                <input
                  type="text"
                  required
                  value={config.templateId}
                  onChange={(e) => setConfig({ ...config, templateId: e.target.value.trim() })}
                  placeholder="promesse_embauche"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:border-[#0B2545] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  EMAILJS_PUBLIC_KEY *
                </label>
                <input
                  type="text"
                  required
                  value={config.publicKey}
                  onChange={(e) => setConfig({ ...config, publicKey: e.target.value.trim() })}
                  placeholder="user_xxxx ou clé publique"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:border-[#0B2545] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expéditeur officiel (Sender Email)
                </label>
                <input
                  type="email"
                  disabled
                  value={config.senderEmail}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 font-mono text-xs text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://dashboard.emailjs.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Accéder au dashboard EmailJS</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-3">
                {savedSuccess && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Enregistré !
                  </span>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-semibold text-xs transition-colors"
                >
                  Enregistrer les identifiants
                </button>
              </div>
            </div>
          </form>

          {/* Test d'envoi direct */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">
              Tester l&apos;envoi automatique d&apos;une promesse d&apos;embauche :
            </h4>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Votre adresse email de test..."
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:border-[#0B2545] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testing}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{testing ? 'Envoi en cours...' : 'Envoyer un test'}</span>
              </button>
            </div>

            {testStatus && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  testStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : testStatus.type === 'error'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-blue-50 text-blue-900 border border-blue-200 animate-pulse'
                }`}
              >
                {testStatus.type === 'info' ? (
                  <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-spin" />
                ) : testStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span className="font-medium">{testStatus.message}</span>
              </div>
            )}
          </div>

          {/* Derniers envois EmailJS */}
          {logs.length > 0 && (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                Historique récent des envois EmailJS :
              </h4>
              <div className="max-h-36 overflow-y-auto space-y-1.5">
                {logs.slice(0, 5).map((l, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{l.recipient}</span>
                      <span className="text-slate-500 ml-2">depuis {l.sender}</span>
                      {l.simulated && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[10px]">
                          Mode simulation
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-slate-400">
                      {new Date(l.timestamp).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
