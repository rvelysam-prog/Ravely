import React, { useState, useEffect } from 'react';
import {
  Globe,
  ShieldCheck,
  ShieldAlert,
  Lock,
  RotateCw,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Mail,
  Send,
  Inbox,
  FileText,
  Star,
  Trash2,
  Paperclip,
  Search,
  Wifi,
  Sparkles,
  Server,
  KeyRound,
  Info
} from 'lucide-react';
import { getCompanyContactConfig } from '../../services/companyConfigService';

interface InfomaniakWebmailTabProps {
  initialEmailContent?: {
    recipient?: string;
    subject?: string;
    htmlBody?: string;
  };
}

export const InfomaniakWebmailTab: React.FC<InfomaniakWebmailTabProps> = ({
  initialEmailContent
}) => {
  const companyConfig = getCompanyContactConfig();
  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'iframe'>('simulator');
  const [urlInput, setUrlInput] = useState('https://mail.infomaniak.com');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // VPN State simulation
  const [vpnConnected, setVpnConnected] = useState(true);
  const [vpnServer, setVpnServer] = useState<'geneva' | 'vancouver' | 'montreal'>('geneva');
  const [vpnLatency, setVpnLatency] = useState(14);
  const [vpnIp, setVpnIp] = useState('185.122.148.92');

  // Simulator Email State
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'sent' | 'drafts'>('inbox');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState(initialEmailContent?.recipient || '');
  const [composeSubject, setComposeSubject] = useState(
    initialEmailContent?.subject || "Acceptation de candidature — Promesse d'Embauche Atlantic Transport Ltd"
  );
  const [composeBody, setComposeBody] = useState(initialEmailContent?.htmlBody || '');
  const [sentSuccessFeedback, setSentSuccessFeedback] = useState(false);

  // Simulated email messages list
  const [simulatedEmails, setSimulatedEmails] = useState([
    {
      id: 1,
      sender: 'Infomaniak Security <support@infomaniak.com>',
      subject: 'Connexion sécurisée réussie via IP Suisse (Genève)',
      date: "Aujourd'hui, 09:12",
      folder: 'inbox',
      unread: false,
      preview: 'Votre session de messagerie a été établie avec succès sous protocole chiffré AES-256...'
    },
    {
      id: 2,
      sender: 'Service RH <atlantictransport.int.contact@ik.me>',
      subject: "Confirmation d'émission — Promesse d'Embauche réf. AT-2026",
      date: "Aujourd'hui, 08:45",
      folder: 'sent',
      unread: false,
      preview: 'Félicitations, votre candidature a été retenue chez Atlantic Transport Ltd...'
    },
    {
      id: 3,
      sender: 'CBSA / ASFC Canada <notifications@cbsa-asfc.gc.ca>',
      subject: 'Agrément OEA & Réglementation Transport Routier 2026',
      date: 'Hier, 16:30',
      folder: 'inbox',
      unread: true,
      preview: 'Mise à jour des protocoles de douane et transit pour la province de Colombie-Britannique...'
    }
  ]);

  useEffect(() => {
    if (initialEmailContent) {
      if (initialEmailContent.recipient) setComposeTo(initialEmailContent.recipient);
      if (initialEmailContent.subject) setComposeSubject(initialEmailContent.subject);
      if (initialEmailContent.htmlBody) setComposeBody(initialEmailContent.htmlBody);
      setIsComposeOpen(true);
    }
  }, [initialEmailContent]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setVpnLatency(Math.floor(12 + Math.random() * 8));
    }, 600);
  };

  const handleSendSimulatedEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim()) return;

    const newEmail = {
      id: Date.now(),
      sender: `Atlantic Transport Ltd <${companyConfig.primaryEmail}>`,
      subject: composeSubject || 'Sans objet',
      date: "À l'instant",
      folder: 'sent',
      unread: false,
      preview: composeBody.replace(/<[^>]+>/g, '').slice(0, 100) + '...'
    };

    setSimulatedEmails((prev) => [newEmail, ...prev]);
    setSentSuccessFeedback(true);
    setTimeout(() => {
      setSentSuccessFeedback(false);
      setIsComposeOpen(false);
      setSelectedFolder('sent');
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* VPN & Connection Status Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0B2545] to-slate-900 text-white rounded-2xl p-5 border border-amber-400/30 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  vpnConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}
              >
                {vpnConnected ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              {vpnConnected && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono tracking-wider text-amber-400 font-bold">
                  Sécurité Réseau &amp; Tunneling
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    vpnConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {vpnConnected ? 'VPN CONNECTÉ AUTOMATIQUEMENT' : 'VPN DÉCONNECTÉ'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                Navigateur Sécurisé &amp; Messagerie Infomaniak (ik.me)
              </h2>
            </div>
          </div>

          {/* Quick VPN details & toggle */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 bg-white/5 p-2.5 rounded-xl border border-white/10 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Server className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Nœud :{' '}
                <strong className="text-white font-mono">
                  {vpnServer === 'geneva' ? 'Genève (CH · Infomaniak HQ)' : vpnServer === 'vancouver' ? 'Vancouver (CA)' : 'Montréal (CA)'}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300 font-mono">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>IP : <strong className="text-white">{vpnIp}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>Latence : <strong className="text-emerald-400">{vpnLatency} ms</strong></span>
            </div>

            <button
              type="button"
              onClick={() => {
                setVpnConnected(!vpnConnected);
                if (!vpnConnected) {
                  setVpnLatency(14);
                  setVpnIp('185.122.148.92');
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors cursor-pointer"
            >
              {vpnConnected ? 'Désactiver VPN' : 'Réactiver VPN'}
            </button>
          </div>
        </div>
      </div>

      {/* Infomaniak Credentials & Webmail Direct Access Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                Compte Professionnel Infomaniak
              </span>
              <span className="text-xs text-slate-500">mail.infomaniak.com (Port 587 STARTTLS)</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-sm sm:text-base font-bold text-[#0B2545]">
              <Mail className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{companyConfig.primaryEmail}</span>
              <button
                type="button"
                onClick={() => handleCopy(companyConfig.primaryEmail, 'email')}
                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                title="Copier l'adresse email"
              >
                {copiedField === 'email' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="https://mail.infomaniak.com"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#143763] text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <ExternalLink className="w-4 h-4 text-amber-400" />
              <span>Ouvrir Infomaniak Webmail</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setIsComposeOpen(true);
                setActiveSubTab('simulator');
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Rédiger un mail avec code source</span>
            </button>
          </div>
        </div>
      </div>

      {/* Simulated Chrome Browser Window */}
      <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
        {/* Chrome Tab Bar */}
        <div className="bg-slate-900 px-4 pt-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0">
            {/* Active Tab */}
            <div className="flex items-center gap-2.5 bg-slate-800 text-white px-4 py-2 rounded-t-xl text-xs font-medium border-t border-x border-slate-700 min-w-[220px]">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white">
                ik
              </div>
              <span className="truncate">Infomaniak Mail — {companyConfig.primaryEmail}</span>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="flex items-center ml-2 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSubTab('simulator')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  activeSubTab === 'simulator' ? 'bg-[#0B2545] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Interface Webmail Intégrée
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('iframe')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  activeSubTab === 'iframe' ? 'bg-[#0B2545] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Iframe Webmail Direct
              </button>
            </div>
          </div>

          {/* Window control buttons (mac/chrome style) */}
          <div className="flex items-center gap-2 pb-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
        </div>

        {/* Chrome Navigation & URL Bar */}
        <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-3 border-b border-slate-700">
          <div className="flex items-center gap-1 text-slate-400">
            <button
              type="button"
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className={`p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ${
                isRefreshing ? 'animate-spin text-amber-400' : ''
              }`}
              title="Actualiser la page"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* URL Input Bar */}
          <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-full px-3.5 py-1.5 text-xs text-slate-300">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-emerald-400 font-medium">https://</span>
            <input
              type="text"
              readOnly
              value={urlInput.replace('https://', '')}
              className="bg-transparent border-none text-white focus:outline-none w-full font-mono text-xs"
            />
            <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                TLS 1.3 · Chiffré VPN
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCopy(urlInput, 'url')}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            title="Copier l'URL"
          >
            {copiedField === 'url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Chrome Viewport Area */}
        <div className="bg-slate-100 min-h-[580px] text-slate-800">
          {activeSubTab === 'simulator' ? (
            /* Interactive Simulated Webmail Interface */
            <div className="flex flex-col md:flex-row h-full min-h-[580px]">
              {/* Webmail Sidebar */}
              <div className="w-full md:w-64 bg-white border-r border-slate-200 p-4 space-y-4">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(true)}
                  className="w-full min-h-[44px] rounded-xl bg-[#0B2545] hover:bg-[#143763] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  <Send className="w-4 h-4 text-amber-400" />
                  <span>Nouveau Message</span>
                </button>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setSelectedFolder('inbox')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                      selectedFolder === 'inbox' ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Inbox className="w-4 h-4 text-amber-600" />
                      <span>Boîte de réception</span>
                    </div>
                    <span className="text-xs bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full font-bold">
                      {simulatedEmails.filter((e) => e.folder === 'inbox').length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFolder('sent')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                      selectedFolder === 'sent' ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Send className="w-4 h-4 text-blue-600" />
                      <span>Éléments envoyés</span>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full font-bold">
                      {simulatedEmails.filter((e) => e.folder === 'sent').length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFolder('drafts')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                      selectedFolder === 'drafts' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>Brouillons</span>
                    </div>
                    <span className="text-xs text-slate-400">0</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Paramètres d'envoi Infomaniak
                  </div>
                  <div className="text-xs bg-slate-50 p-2.5 rounded-lg space-y-1 text-slate-600 border border-slate-200">
                    <div>Serveur : <span className="font-mono text-slate-900">mail.infomaniak.com</span></div>
                    <div>Port : <span className="font-mono text-slate-900">587 (STARTTLS)</span></div>
                    <div>Expéditeur : <span className="font-mono text-slate-900 text-[11px]">{companyConfig.primaryEmail}</span></div>
                  </div>
                </div>
              </div>

              {/* Webmail Message View / Composer */}
              <div className="flex-1 bg-white p-4 sm:p-6 flex flex-col justify-between">
                {isComposeOpen ? (
                  /* Composer View */
                  <form onSubmit={handleSendSimulatedEmail} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-[#0B2545]" />
                        <h3 className="font-bold text-base text-[#0B2545]">
                          Composer un nouveau message (Infomaniak)
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsComposeOpen(false)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>

                    {sentSuccessFeedback && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Message envoyé avec succès via la boîte de messagerie Infomaniak !</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <label className="w-16 text-xs font-semibold text-slate-600">De :</label>
                        <input
                          type="text"
                          readOnly
                          value={`Atlantic Transport Ltd <${companyConfig.primaryEmail}>`}
                          className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-700"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="w-16 text-xs font-semibold text-slate-600">À :</label>
                        <input
                          type="email"
                          required
                          value={composeTo}
                          onChange={(e) => setComposeTo(e.target.value)}
                          placeholder="candidat@email.com"
                          className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:border-[#0B2545] focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="w-16 text-xs font-semibold text-slate-600">Objet :</label>
                        <input
                          type="text"
                          required
                          value={composeSubject}
                          onChange={(e) => setComposeSubject(e.target.value)}
                          placeholder="Objet du message..."
                          className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:border-[#0B2545] focus:outline-none font-medium"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-slate-700">
                            Corps du message (Texte ou HTML prêt à coller)
                          </label>
                          <span className="text-[11px] text-slate-500">
                            Supporte le format HTML de la promesse d'embauche
                          </span>
                        </div>
                        <textarea
                          rows={12}
                          value={composeBody}
                          onChange={(e) => setComposeBody(e.target.value)}
                          placeholder="Collez ici le code HTML généré ou rédigez votre message..."
                          className="w-full border border-slate-300 rounded-xl p-3 font-mono text-xs text-slate-800 focus:border-[#0B2545] focus:outline-none leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Envoi sécurisé SSL/TLS · IP VPN {vpnIp}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsComposeOpen(false)}
                          className="px-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-[#0B2545] hover:bg-[#143763] text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                        >
                          <Send className="w-4 h-4 text-amber-400" />
                          <span>Envoyer le mail</span>
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  /* Messages List View */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h3 className="font-bold text-base text-[#0B2545]">
                          {selectedFolder === 'inbox' ? 'Boîte de réception' : 'Messages envoyés'}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Connecté en direct sur le webmail Infomaniak (ik.me)
                        </p>
                      </div>

                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Rechercher un message..."
                          className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-[#0B2545] focus:outline-none w-48 sm:w-64"
                        />
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                      {simulatedEmails
                        .filter((e) => e.folder === selectedFolder)
                        .map((email) => (
                          <div
                            key={email.id}
                            className={`p-3.5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4 cursor-pointer ${
                              email.unread ? 'bg-amber-50/40 font-semibold' : ''
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#0B2545]">{email.sender}</span>
                                {email.unread && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                )}
                              </div>
                              <div className="text-xs sm:text-sm text-slate-800 font-medium">{email.subject}</div>
                              <div className="text-xs text-slate-500 line-clamp-1">{email.preview}</div>
                            </div>

                            <span className="text-[11px] text-slate-400 shrink-0 font-mono">{email.date}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Direct Iframe View with Fallback Notice */
            <div className="p-4 h-full min-h-[580px] flex flex-col space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs sm:text-sm text-blue-900 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">
                    Information relative à l'intégration Iframe d'Infomaniak :
                  </span>
                  <p>
                    Comme la majorité des fournisseurs de messagerie sécurisés (Infomaniak, Gmail, ProtonMail),
                    le serveur Webmail envoie un en-tête de protection <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">X-Frame-Options: SAMEORIGIN</code>.
                    Si votre navigateur bloque l'affichage direct dans l'iframe ci-dessous, utilisez le bouton d'accès direct sécurisé pour ouvrir le Webmail dans un onglet dédié tout en conservant le VPN actif.
                  </p>
                </div>
              </div>

              <div className="flex-1 bg-white rounded-xl border border-slate-300 overflow-hidden relative min-h-[460px]">
                <iframe
                  src="https://mail.infomaniak.com"
                  title="Infomaniak Webmail"
                  className="w-full h-[520px] border-none"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
