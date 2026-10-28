import React, { useEffect, useState } from 'react';
import {
  Download,
  Printer,
  ShieldCheck,
  FileText,
  ArrowLeft,
  Lock,
  ExternalLink
} from 'lucide-react';
import {
  StudioDocument,
  getStudioDocument,
  exportStudioPdf
} from '../services/documentStudioService';

interface PublicDocumentViewerProps {
  documentId: string;
  onBackToHome: () => void;
}

export const PublicDocumentViewer: React.FC<PublicDocumentViewerProps> = ({
  documentId,
  onBackToHome
}) => {
  const [docData, setDocData] = useState<StudioDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getStudioDocument(documentId)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setDocData(data);
        } else {
          setError(
            "Le document demandé est introuvable ou a été archivé. Veuillez vérifier le lien reçu par e-mail."
          );
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Erreur chargement document public:', err);
        setError("Erreur lors de la récupération du document sécurisé.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  const handleDownloadPdf = async () => {
    if (!docData) return;
    setDownloading(true);
    try {
      const blob = await exportStudioPdf(docData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = (docData.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanTitle}${docData.matricule ? `_${docData.matricule}` : ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur téléchargement PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="w-12 h-12 border-4 border-[#0B2545] border-t-amber-400 rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-[#0B2545]">
          Chargement du document sécurisé...
        </h2>
        <p className="text-xs text-slate-500 mt-1">Préparation du visualiseur haute définition</p>
      </div>
    );
  }

  if (error || !docData) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Document Non Accessible</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error || 'Document introuvable.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onBackToHome}
              className="px-5 py-2.5 rounded-xl bg-[#0B2545] text-white text-xs font-bold hover:bg-[#134074] transition-colors cursor-pointer"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Barre supérieure officielle */}
      <header className="bg-[#0B2545] text-white border-b-2 border-amber-400/40 sticky top-0 z-40 shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToHome}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Retour à l'accueil"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
                Portail de Consultation Sécurisé
              </span>
              <h1 className="text-sm sm:text-base font-bold text-white leading-tight">
                {docData.title || 'Document Officiel'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:inline-flex px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Génération...' : 'Télécharger le PDF'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* Bandeau d'authenticité */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-[#0B2545]">{docData.title}</h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Authentique &amp; Certifié
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {docData.recipientName ? (
                  <>
                    Destinataire : <strong className="text-slate-800">{docData.recipientName}</strong> ·{' '}
                  </>
                ) : null}
                {docData.matricule ? (
                  <>
                    Réf. : <span className="font-mono text-amber-700 font-bold">{docData.matricule}</span> ·{' '}
                  </>
                ) : null}
                Date : {new Date(docData.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-right shrink-0">
            <span className="block font-mono text-[11px] text-slate-700">Document Conforme</span>
            <span className="text-[10px] text-slate-400">ID : {docData.id}</span>
          </div>
        </div>

        {/* Aperçu du document */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-8 shadow-md">
          <div className="max-w-[720px] mx-auto border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
            {docData.cleanedBackgroundDataUrl || docData.originalImageDataUrl ? (
              <img
                src={docData.cleanedBackgroundDataUrl || docData.originalImageDataUrl}
                alt={docData.title}
                className="w-full h-auto block"
              />
            ) : docData.reconstructedHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: docData.reconstructedHtml }}
                className="overflow-x-auto"
              />
            ) : (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aperçu non disponible</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-slate-200/70 py-4 text-center text-xs text-slate-500 border-t border-slate-200">
        Document officiel sécurisé · Accès protégé par lien unique
      </footer>
    </div>
  );
};
