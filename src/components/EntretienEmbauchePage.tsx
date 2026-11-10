import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  ShieldCheck,
  CheckCircle2,
  Clock,
  User,
  Briefcase,
  Calendar,
  Lock,
  ArrowRight,
  ExternalLink,
  Phone,
  Building2,
  Check,
  Sparkles,
  QrCode,
  FileCheck,
  ArrowLeft,
  Download,
  FileText
} from 'lucide-react';
import { SiteSettings, PublicPage } from '../types';
import {
  TicketEntretienData,
  getInterviewSessionByCode,
  markInterviewCompleted,
  generateTicketEntretienPdf
} from '../services/contractGenerationService';
import { BrandLogo } from './BrandLogo';

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
          setCodeError("Ce code d'entretien a déjà été utilisé et clôturé. Pour toute question, veuillez contacter les Ressources Humaines.");
          setSession(null);
        } else {
          setSession(found);
          // Initialise les messages de bienvenue du recruteur RH
          setMessages([
            {
              id: 'msg_1',
              sender: 'recruiter',
              senderName: found.recruteurNom || 'Antoine Forestin (Direction RH)',
              text: `Bonjour ${found.candidatNom}, bienvenue à votre entretien d'embauche officiel pour le poste de ${found.posteConcerne} chez ${settings.company_name}. Je suis votre interlocuteur pour cet échange. Pouvez-vous me confirmer votre situation actuelle et votre disponibilité ?`,
              timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      } else {
        setCodeError("Code ID Candidature invalide ou introuvable. Veuillez vérifier le code figurant sur votre Ticket d'entretien ou Contrat de prestation.");
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
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Réponse intelligente simulée du recruteur RH
    setTimeout(() => {
      let replyText = "Merci pour ces précisions importantes. Vos compétences et votre parcours correspondent parfaitement à nos exigences pour nos opérations au Canada. Nous accordons une importance primordiale au respect des règles de sécurité et à la rigueur professionnelle.";

      const candidateTextLower = userMsg.text.toLowerCase();
      if (candidateTextLower.includes('permis') || candidateTextLower.includes('classe 1') || candidateTextLower.includes('conduire') || candidateTextLower.includes('spl')) {
        replyText = "C'est une excellente nouvelle concernant vos qualifications de conduite. Nos ensembles routiers sont récents et équipés des dernières technologies télématiques et ELD. Êtes-vous prêt à suivre notre session d'intégration à Surrey (Colombie-Britannique) ?";
      } else if (candidateTextLower.includes('salaire') || candidateTextLower.includes('cad') || candidateTextLower.includes('taux') || candidateTextLower.includes('rémunération')) {
        replyText = "Absolument. Comme stipulé sur notre fiche d'offre et notre contrat de prestation, les rémunérations respectent les normes d'emploi de la Colombie-Britannique (taux horaire attractif en $ CAD avec heures supp. à 150% et couverture santé/REER complète dès l'embauche).";
      } else if (candidateTextLower.includes('disponible') || candidateTextLower.includes('délai') || candidateTextLower.includes('immédiat') || candidateTextLower.includes('mois')) {
        replyText = "Très bien noté. Notre cabinet mandataire CRIC partenaire pilote l'ensemble des démarches d'immigration et d'EIMT auprès d'IRCC pour faciliter votre intégration dans les délais optimaux.";
      } else if (candidateTextLower.includes('logement') || candidateTextLower.includes('hébergement') || candidateTextLower.includes('surrey')) {
        replyText = "Notre entreprise prévoit un accompagnement complet à l'installation avec possibilité d'aide à l'hébergement initial à Surrey pour faciliter votre arrivée au Canada en toute sérénité.";
      }

      const botMsg: ChatMessage = {
        id: `msg_bot_${Date.now()}`,
        sender: 'recruiter',
        senderName: session.recruteurNom || 'Antoine Forestin (Direction RH)',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
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
        text: "✅ Votre entretien d'embauche officiel a été validé et enregistré par la Direction des Ressources Humaines. Un compte-rendu a été transmis à notre équipe et au cabinet mandataire CRIC. Vous recevrez la confirmation officielle par email.",
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
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
    <div className="min-h-screen bg-slate-100/80 text-slate-900 pb-16">
      {/* En-tête de page */}
      <div className="bg-[#0B2545] text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-amber-400/20 shadow-xs">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded">
                  Espace Candidat Sécurisé
                </span>
                <span className="text-xs text-slate-300">· Recrutement Canada &amp; International</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
                Entretien d’Embauche Officiel
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('accueil')}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/20"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>← Retour à l&apos;accueil</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Connexion cryptée SSL · Système RH Conforme</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {!session ? (
          /* 1. ÉCRAN DE SÉCURITÉ : DEMANDE DU CODE ID CANDIDATURE */
          <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-[#0B2545]/10 text-[#0B2545] flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Accès Sécurisé à votre Entretien</h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                Veuillez renseigner le <strong>CODE ID CANDIDATURE</strong> figurant sur votre <strong>Ticket d’Entretien d’Embauche</strong> ou sur votre <strong>Contrat de Prestation CRIC</strong>.
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Code ID Candidature (Ex: ENT-ATL-8942-K9) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="ENT-ATL-XXXX-XX"
                    className="w-full min-h-[48px] px-4 font-mono font-bold text-base tracking-wider text-[#0B2545] rounded-xl border border-slate-300 focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/20 focus:outline-none uppercase bg-slate-50 focus:bg-white"
                  />
                  <ShieldCheck className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {codeError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <span className="font-bold shrink-0">⚠️</span>
                  <span>{codeError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying || !codeInput.trim()}
                className="w-full min-h-[46px] rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
              >
                <span>{isVerifying ? 'Vérification en cours...' : 'Accéder à mon entretien'}</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </form>

            {/* Aide et raccourci démo */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-slate-400" />
                <span>Le scan du code-barres sur votre ticket donne un accès direct sans saisie.</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setCodeInput('ENT-ATL-8942-K9');
                  handleValidateCode('ENT-ATL-8942-K9');
                }}
                className="text-[#0066B3] hover:underline font-bold whitespace-nowrap"
              >
                Utiliser le code démo (ENT-ATL-8942-K9)
              </button>
            </div>
          </div>
        ) : (
          /* 2. ÉCRAN PRINCIPAL D'ENTRETIEN EN LIGNE UNLOCKED */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Colonne Gauche (4 cols) : Détails du candidat, Poste et Bouton WhatsApp */}
            <div className="lg:col-span-4 space-y-4">
              {/* Carte Récapitulative Officielle */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Session Active
                  </span>
                  <span className="font-mono text-xs text-slate-500 font-bold">
                    {session.codeIdCandidature}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Candidat convoqué :</div>
                  <div className="text-base font-extrabold text-[#0B2545]">{session.candidatNom}</div>
                  <div className="text-xs text-slate-500">{session.candidatEmail}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Poste visé :</span>
                    <span className="font-bold text-[#1D4F88]">{session.posteConcerne}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Classification CNP :</span>
                    <span className="font-mono font-bold text-slate-700">Code CNP {session.codeCnp}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Recruteur RH :</span>
                    <span className="font-semibold text-slate-800">{session.recruteurNom}</span>
                  </div>
                </div>

                {/* BOUTON WHATSAPP BUSINESS DIRECT */}
                <div className="pt-2">
                  <a
                    href={buildWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
                    title="Ouvrir une discussion directe avec l'équipe RH sur WhatsApp Business avec votre référence"
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>Continuer sur WhatsApp Business</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                  <span className="text-[10px] text-slate-400 block text-center mt-1.5">
                    Discussion officielle avec le service recrutement d&apos;Atlantic Transport Ltd.
                  </span>
                </div>

                {/* Bouton Clôturer l'entretien */}
                {!interviewFinished ? (
                  <button
                    type="button"
                    onClick={handleCompleteInterview}
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Clôturer cet entretien</span>
                  </button>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center font-bold">
                    ✓ Entretien d&apos;embauche clôturé
                  </div>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await generateTicketEntretienPdf(session);
                    } catch (err) {
                      console.error('Erreur téléchargement ticket:', err);
                    }
                  }}
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Télécharger mon Ticket (PDF)</span>
                </button>
              </div>
            </div>

            {/* Colonne Droite (8 cols) : Système de CHAT interactif */}
            <div className="lg:col-span-8 flex flex-col h-[640px] bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
              {/* Header du Chat */}
              <div className="bg-[#0B2545] text-white px-5 py-3.5 flex items-center justify-between border-b border-amber-400/20">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-xs">
                      RH
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0B2545] absolute bottom-0 right-0" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">{session.recruteurNom}</div>
                    <div className="text-[10px] text-emerald-400 font-medium">En ligne · Recrutement &amp; Mobilité Canada</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-300">Entretien {session.codeIdCandidature}</span>
                </div>
              </div>

              {/* Zone de messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/60 text-xs">
                {messages.map((msg) => {
                  const isRecruiter = msg.sender === 'recruiter';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isRecruiter ? 'items-start' : 'items-end'}`}
                    >
                      <div className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                        {msg.senderName} · {msg.timestamp}
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed shadow-2xs ${
                          isRecruiter
                            ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                            : 'bg-[#0B2545] text-white rounded-tr-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] italic pl-2 pt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                    <span>{session.recruteurNom} est en train d&apos;écrire...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Champ d'envoi de message */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  disabled={interviewFinished}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    interviewFinished
                      ? "L'entretien est clôturé. Merci pour votre participation !"
                      : "Saisissez votre réponse pour le recruteur..."
                  }
                  className="flex-1 min-h-[44px] px-4 rounded-xl border border-slate-300 text-xs focus:border-[#0B2545] focus:outline-none bg-slate-50 focus:bg-white disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || interviewFinished}
                  className="min-h-[44px] px-4 rounded-xl bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
                >
                  <span>Envoyer</span>
                  <Send className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
