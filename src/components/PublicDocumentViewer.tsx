import React, { useEffect, useState } from 'react';
import {
  Download,
  Printer,
  ShieldCheck,
  FileText,
  ArrowLeft,
  Lock
} from 'lucide-react';
import {
  StudioDocument,
  getStudioDocument,
  exportStudioPdf
} from '../services/documentStudioService';
import { ActionButton, MetadataRow, SurfaceCard } from './ui/DesignSystem';

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
            'Le document demandé est introuvable ou a été archivé. Veuillez vérifier le lien reçu par e-mail.'
          );
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Erreur chargement document public:', err);
        setError('Erreur lors de la récupération du document sécurisé.');
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
      <div
        className="min-h-screen bg-surface-canvas flex flex-col items-center justify-center p-6 text-ink-primary"
        role="status"
        aria-label="Chargement du document sécurisé"
      >
        <div className="w-full max-w-md ds-card p-8 space-y-4">
          <div className="h-5 w-48 bg-surface-subtle rounded animate-pulse mx-auto" />
          <div className="h-3 w-64 bg-surface-subtle rounded animate-pulse mx-auto" />
          <div className="h-40 w-full bg-surface-subtle rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !docData) {
    return (
      <div className="min-h-screen bg-surface-canvas flex items-center justify-center p-4">
        <SurfaceCard className="max-w-md w-full p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-status-danger border border-red-200 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-ink-primary">Document Non Accessible</h2>
          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            {error || 'Document introuvable.'}
          </p>
          <div className="pt-2">
            <ActionButton variant="navy" onClick={onBackToHome} className="text-xs">
              Retour à l&apos;accueil
            </ActionButton>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col font-sans">
      {/* Barre supérieure officielle */}
      <header className="bg-brand-navy text-white border-b-2 border-brand-gold/40 sticky top-0 z-40 shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToHome}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Retour à l'accueil"
              title="Retour à l'accueil"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <span className="text-[11px] font-mono text-brand-amber font-bold uppercase tracking-wider block">
                Portail de Consultation Sécurisé
              </span>
              <h1 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
                {docData.title || 'Document Officiel'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:inline-flex ds-btn-base bg-white/10 hover:bg-white/20 text-white text-xs"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              <span>Imprimer</span>
            </button>

            <ActionButton
              variant="primary"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="text-xs sm:text-sm"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>{downloading ? 'Génération...' : 'Télécharger le PDF'}</span>
            </ActionButton>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* Bandeau d'authenticité */}
        <SurfaceCard className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-status-success border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-base text-brand-navy">{docData.title}</h2>
                <span className="text-xs font-bold text-emerald-700">· Authentique &amp; Certifié</span>
              </div>
              <MetadataRow
                className="mt-1"
                items={[
                  docData.recipientName ? `Destinataire : ${docData.recipientName}` : null,
                  docData.matricule ? `Réf. : ${docData.matricule}` : null,
                  `Date : ${new Date(docData.createdAt).toLocaleDateString('fr-FR')}`
                ]}
              />
            </div>
          </div>

          <div className="text-xs text-ink-secondary bg-surface-subtle p-2.5 rounded-xl border border-surface-border text-right shrink-0">
            <span className="block font-mono text-xs text-ink-primary font-semibold">
              Document Conforme
            </span>
            <span className="text-[11px] font-mono tabular-nums text-ink-muted">
              ID : {docData.id}
            </span>
          </div>
        </SurfaceCard>

        {/* Aperçu du document */}
        <SurfaceCard className="p-4 sm:p-8 shadow-md">
          <div className="max-w-[720px] mx-auto border border-surface-border rounded-xl overflow-hidden shadow-sm bg-white">
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
              <div className="p-12 text-center text-ink-muted">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" aria-hidden="true" />
                <p className="text-sm">Aperçu non disponible</p>
              </div>
            )}
          </div>
        </SurfaceCard>
      </main>

      <footer className="bg-surface-subtle py-4 text-center text-xs text-ink-secondary border-t border-surface-border">
        Document officiel sécurisé · Accès protégé par lien unique
      </footer>
    </div>
  );
};
