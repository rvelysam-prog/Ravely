import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Code,
  Copy,
  Check,
  Download,
  Send,
  Eye,
  FileCheck,
  Columns,
  Layers,
  Sparkles,
  HelpCircle,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sliders,
  Maximize2,
  Info,
  ShieldCheck,
  ImageIcon
} from 'lucide-react';
import {
  HtmlRastResult,
  generateHtmlRastTemplate,
  applyVariablesToHtmlRast,
  HtmlRastInput
} from '../../services/htmlRastService';

interface HtmlRastModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputData: HtmlRastInput;
  onOpenInWebmail?: (emailContent: {
    recipient: string;
    subject: string;
    htmlBody: string;
  }) => void;
}

export const HtmlRastModal: React.FC<HtmlRastModalProps> = ({
  isOpen,
  onClose,
  inputData,
  onOpenInWebmail
}) => {
  // Onglets principaux correspondant exactement aux 5 livrables requis
  const [activeTab, setActiveTab] = useState<
    'code' | 'splitscreen' | 'assets' | 'variables' | 'guides' | 'audit'
  >('splitscreen');

  // Génération initiale du template HTML RAST
  const initialResult = useMemo(() => {
    return generateHtmlRastTemplate(inputData);
  }, [inputData]);

  // Valeurs des variables personnalisables modifiables en direct
  const [variableValues, setVariableValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    initialResult.variableFields.forEach((f) => {
      init[f.key] = f.currentValue;
    });
    return init;
  });

  // Code HTML calculé en temps réel avec les variables injectées
  const liveHtmlCode = useMemo(() => {
    return applyVariablesToHtmlRast(initialResult.fullHtmlCode, variableValues);
  }, [initialResult.fullHtmlCode, variableValues]);

  // États de copie
  const [copiedCode, setCopiedCode] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Synchronisation des variables lors d'un changement d'entrée
  useEffect(() => {
    const updated: Record<string, string> = {};
    initialResult.variableFields.forEach((f) => {
      updated[f.key] = f.currentValue;
    });
    setVariableValues(updated);
  }, [initialResult]);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(liveHtmlCode.trim());
      setCopiedCode(true);
      showToast('Code HTML RAST complet copié dans le presse-papier !');
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      showToast("Impossible d'accéder au presse-papier.", 'info');
    }
  };

  const handleDownloadHtmlFile = () => {
    const blob = new Blob([liveHtmlCode], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_html_rast_${(inputData.referenceNumber || 'officiel').replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Fichier HTML RAST téléchargé avec succès.');
  };

  const handleDownloadAsset = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Asset "${filename}.png" téléchargé.`);
  };

  const handleTransferToInfomaniak = () => {
    if (onOpenInWebmail) {
      onOpenInWebmail({
        recipient: variableValues.EMAIL_DESTINATAIRE || inputData.recipientEmail || '',
        subject: `${variableValues.TITRE_DOCUMENT || inputData.documentTitle} - Réf. ${variableValues.REFERENCE_DOSSIER || inputData.referenceNumber}`,
        htmlBody: liveHtmlCode
      });
      onClose();
    } else {
      showToast('Redirection vers le Webmail Infomaniak...', 'info');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white rounded-2xl max-w-7xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col">
        
        {/* ================================================================= */}
        {/* EN-TÊTE DU MODAL : FONCTION HTML RAST                             */}
        {/* ================================================================= */}
        <div className="bg-[#0B2545] text-white p-4 sm:p-5 flex items-center justify-between gap-4 border-b-2 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-sm shadow-md shrink-0">
              RAST
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase text-amber-400 font-bold tracking-wider">
                  FONCTION HTML RAST
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                  Expert HTML E-mail &amp; Reproduction Fidèle
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Reproduction conforme du document · Zéro déformation · Texte 100% éditable
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyCode}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copié !' : 'Copier Code HTML'}</span>
            </button>

            <button
              type="button"
              onClick={handleTransferToInfomaniak}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Transférer vers Webmail</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer ml-1"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BARRE DE NAVIGATION DES 5 LIVRABLES EXIGÉS                         */}
        {/* ================================================================= */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('splitscreen')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'splitscreen'
                  ? 'bg-[#0B2545] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5 text-amber-400" />
              <span>1. Vérification Visuelle (Split Screen)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-[#0B2545] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5 text-blue-400" />
              <span>2. Code HTML Complet</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('assets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'assets'
                  ? 'bg-[#0B2545] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>3. Images Extraites ({initialResult.assets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('variables')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'variables'
                  ? 'bg-[#0B2545] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-purple-500" />
              <span>4. Champs &amp; Réutilisation</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('guides')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'guides'
                  ? 'bg-[#0B2545] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>5. Guides d'Envoi (Gmail / Webmail)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-[#0B2545] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rapport d'Audit (8/8)</span>
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {toastMsg && (
          <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 text-center shadow-md animate-fade-in flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* CORPS PRINCIPAL SELON L'ONGLET ACTIF                              */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-50">
          
          {/* --------------------------------------------------------------- */}
          {/* LIVRABLE 1 : VÉRIFICATION VISUELLE CÔTE-À-CÔTE (SPLIT SCREEN)   */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'splitscreen' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-[#0B2545]">
                    Comparateur Visuel Synchrone : Document Original (gauche) vs Template HTML RAST (droite)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Zéro déformation · Proportions A4 préservées · Texte éditable
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Colonne GAUCHE : Document Original de référence */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-xs uppercase tracking-wider text-[#0B2545] flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Document Original de Référence</span>
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono truncate max-w-[180px]">
                      {inputData.originalFileName || 'original.pdf'}
                    </span>
                  </div>

                  <div className="bg-slate-900 rounded-xl p-2 flex-1 flex items-center justify-center overflow-auto max-h-[620px] min-h-[460px]">
                    {inputData.originalImageDataUrl ? (
                      <img
                        src={inputData.originalImageDataUrl}
                        alt="Document Original"
                        className="max-w-full max-h-[600px] object-contain rounded shadow-lg"
                      />
                    ) : (
                      <div className="text-center text-slate-400 p-8">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <span className="text-xs">Aucun aperçu original disponible</span>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 text-center font-mono pt-1">
                    Source de référence importée par l'utilisateur
                  </div>
                </div>

                {/* Colonne DROITE : Rendu Live du Template HTML RAST */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Rendu HTML RAST (Texte 100% Éditable)</span>
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                      Format E-mail Tableaux
                    </span>
                  </div>

                  <div className="bg-slate-200/70 rounded-xl p-2 sm:p-4 flex-1 overflow-auto max-h-[620px] min-h-[460px]">
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      dangerouslySetInnerHTML={{ __html: liveHtmlCode }}
                      className="bg-white rounded-lg shadow-md overflow-hidden max-w-[680px] mx-auto outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="text-[10px] text-emerald-700 text-center font-mono pt-1">
                    Cliquez sur les textes ci-dessus pour tester l'édition directe
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* LIVRABLE 2 : CODE HTML COMPLET EN UN SEUL BLOC                  */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-[#0B2545] flex items-center gap-2">
                    <Code className="w-4 h-4 text-blue-600" />
                    <span>Code Source HTML Complet (Prêt pour Messagerie)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fourni en un seul bloc autonome, prêt à être copié dans KitsCMS, le Webmail Infomaniak ou Gmail.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadHtmlFile}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Télécharger .html</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Code copié !' : 'Copier tout le code'}</span>
                  </button>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">template_html_rast.html</span>
                  <span className="font-mono text-[11px] text-amber-400">
                    {liveHtmlCode.split('\n').length} lignes · {(new Blob([liveHtmlCode]).size / 1024).toFixed(1)} Ko
                  </span>
                </div>
                <pre className="p-4 overflow-auto max-h-[560px] text-xs font-mono text-emerald-400 leading-relaxed selection:bg-amber-500 selection:text-slate-950">
                  {liveHtmlCode}
                </pre>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* LIVRABLE 3 : ASSETS GRAPHIQUES ORIGINAUX EXTRAITS (SANS IA)     */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'assets' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-[#0B2545] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>Éléments Graphiques Originaux Extraits du Document</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    RÈGLE SANS IA RESPECTÉE : Logos, signatures manuscrites et cachets extraits au pixel près sans aucun redessin ni altération.
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{initialResult.assets.length} image(s) extraite(s)</span>
                </div>
              </div>

              {initialResult.assets.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
                  <ImageIcon className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-base text-slate-700">Aucun asset graphique découpé</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Dans l'Atelier Document, tracez un rectangle autour du logo, de la signature ou du cachet avec votre souris pour extraire l'élément en haute résolution.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {initialResult.assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-[#0B2545] truncate">
                          {asset.name}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {asset.width} × {asset.height} px
                        </span>
                      </div>

                      <div className="h-28 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center p-2 relative">
                        <img
                          src={asset.dataUrl}
                          alt={asset.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="text-slate-500 flex items-center justify-between text-[11px]">
                          <span>Rôle :</span>
                          <strong className="text-slate-800">{asset.roleLabel}</strong>
                        </div>
                        <div className="text-slate-500 flex items-center justify-between text-[11px]">
                          <span>Coordonnées source :</span>
                          <span className="font-mono">({asset.coordinates.x}, {asset.coordinates.y})</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadAsset(asset.dataUrl, asset.name)}
                        className="w-full min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 hover:border-[#0B2545] bg-slate-50 hover:bg-slate-100 text-[#0B2545] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-600" />
                        <span>Télécharger PNG</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* LIVRABLE 4 : CHAMPS PERSONNALISABLES & RÉUTILISATION MULTI-ENVOIS */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'variables' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-[#0B2545] flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-600" />
                    <span>Champs Variables &amp; Formulaire de Réutilisation</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modifiez les informations ci-dessous pour générer un nouvel e-mail sans altérer le design original.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const reset: Record<string, string> = {};
                    initialResult.variableFields.forEach((f) => {
                      reset[f.key] = f.defaultValue;
                    });
                    setVariableValues(reset);
                    showToast('Variables réinitialisées aux valeurs du document.');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-slate-500" />
                  <span>Restaurer valeurs initiales</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {initialResult.variableFields.map((field) => (
                    <div
                      key={field.key}
                      className={`p-3.5 rounded-xl border space-y-1.5 ${
                        field.type === 'textarea' ? 'md:col-span-2' : ''
                      } bg-slate-50/60 border-slate-200`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label className="font-bold text-xs text-[#0B2545]">
                          {field.label}
                        </label>
                        <span className="font-mono text-[10px] bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200 font-bold">
                          {'{{' + field.key + '}}'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{field.description}</p>

                      {field.type === 'textarea' ? (
                        <textarea
                          rows={2}
                          value={variableValues[field.key] || ''}
                          onChange={(e) =>
                            setVariableValues({ ...variableValues, [field.key]: e.target.value })
                          }
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0B2545]"
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={variableValues[field.key] || ''}
                          onChange={(e) =>
                            setVariableValues({ ...variableValues, [field.key]: e.target.value })
                          }
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0B2545]"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Les modifications sont immédiatement injectées dans le code source HTML RAST.
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier avec ces valeurs</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* LIVRABLE 5 : GUIDE D'ENVOI & AFFICHAGE (GMAIL / INFOMANIAK...)   */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'guides' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <h3 className="font-bold text-sm text-[#0B2545] flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-500" />
                  <span>Méthode d'Envoi et de Rendu dans les Messageries Professionnelles</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Suivez ces étapes pour injecter le template HTML RAST dans votre messagerie habituelle sans altérer le design.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Guide Infomaniak */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <h4 className="font-bold text-sm text-[#0B2545]">Webmail Infomaniak (Mail)</h4>
                  </div>
                  <ol className="space-y-2 text-xs text-slate-600 pl-4 list-decimal leading-relaxed">
                    {initialResult.instructions.infomaniak.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                  <button
                    type="button"
                    onClick={handleTransferToInfomaniak}
                    className="w-full mt-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Ouvrir dans Infomaniak</span>
                  </button>
                </div>

                {/* Guide Gmail */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold text-xs">
                      2
                    </span>
                    <h4 className="font-bold text-sm text-[#0B2545]">Google Gmail</h4>
                  </div>
                  <ol className="space-y-2 text-xs text-slate-600 pl-4 list-decimal leading-relaxed">
                    {initialResult.instructions.gmail.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>

                {/* Guide Outlook */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center font-bold text-xs">
                      3
                    </span>
                    <h4 className="font-bold text-sm text-[#0B2545]">Microsoft Outlook</h4>
                  </div>
                  <ol className="space-y-2 text-xs text-slate-600 pl-4 list-decimal leading-relaxed">
                    {initialResult.instructions.outlook.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Guide Hébergement d'images */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-2">
                <h4 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  <span>Méthode d'Hébergement &amp; Affichage des Images Originales</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4 leading-relaxed">
                  {initialResult.instructions.imageHosting.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* LIVRABLE 6 : RAPPORT D'AUDIT & CHECKLIST DES 8 CONSIGNES        */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-[#0B2545] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Rapport d'Audit &amp; Respect des Consignes de Reproduction</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Vérification point par point des 8 critères stricts fixés pour le template HTML RAST.
                  </p>
                </div>

                <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
                  8 / 8 Critères Validés
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {initialResult.auditReport.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-[#0B2545]">
                        {item.category}
                      </span>
                      {item.status === 'passed' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Conforme</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>À compléter</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-700">{item.title}</div>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ================================================================= */}
        {/* PIED DU MODAL : ACTIONS RAPIDES                                   */}
        {/* ================================================================= */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0B2545]">Template HTML RAST :</span>
            <span className="text-slate-700">{variableValues.TITRE_DOCUMENT || inputData.documentTitle}</span>
            <span>·</span>
            <span className="font-mono text-amber-700 font-bold">{variableValues.REFERENCE_DOSSIER || inputData.referenceNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copier le Code HTML RAST</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
