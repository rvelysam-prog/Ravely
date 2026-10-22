import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import {
  CreditCard,
  Download,
  Upload,
  Printer,
  RotateCw,
  QrCode,
  Users,
  Copy,
  Check,
  Code
} from 'lucide-react';
import { Employee, SiteSettings } from '../../types';
import { getCompanyContactConfig } from '../../services/companyConfigService';
import { generateDefaultAvatarSvgDataUri } from '../../services/staticStorage';

interface EmployeeBadgeGeneratorModalProps {
  employee: Employee | null;
  employees: Employee[];
  settings: SiteSettings;
  isOpen: boolean;
  onClose: () => void;
  onSelectEmployee?: (emp: Employee) => void;
}

export const EmployeeBadgeGeneratorModal: React.FC<EmployeeBadgeGeneratorModalProps> = ({
  employee,
  employees,
  settings,
  isOpen,
  onClose,
  onSelectEmployee
}) => {
  const companyConfig = getCompanyContactConfig();
  const [currentEmp, setCurrentEmp] = useState<Employee | null>(employee || employees[0] || null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeSide, setActiveSide] = useState<'recto' | 'verso'>('recto');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (employee) {
      setCurrentEmp(employee);
    } else if (!currentEmp && employees.length > 0) {
      setCurrentEmp(employees[0]);
    }
  }, [employee, employees]);

  // Generate dynamic QR Code pointing to the employee's online personal portal
  useEffect(() => {
    if (!currentEmp) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://atlantictransportltd.ca';
    const targetUrl = `${origin}/?matricule=${encodeURIComponent(currentEmp.matricule)}&token=${encodeURIComponent(currentEmp.access_token || currentEmp.matricule)}`;

    QRCode.toDataURL(targetUrl, {
      width: 256,
      margin: 1,
      color: {
        dark: '#0B2240',
        light: '#FFFFFF'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('Erreur génération QR Code badge:', err));
  }, [currentEmp]);

  // Anti-bug photo loader: uses FileReader & Base64 so canvas is never tainted
  function loadPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function () {
      const cardPhotoEl = document.getElementById('cardPhoto') as HTMLImageElement;
      if (cardPhotoEl && typeof reader.result === 'string') {
        cardPhotoEl.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  }

  // Exact function requested by the user: html2canvas with scale 3, useCORS: true, allowTaint: false
  function downloadCard() {
    const card = document.getElementById('bizCard');
    if (!card) return;
    setIsExporting(true);

    html2canvas(card, { scale: 3, useCORS: true, allowTaint: false })
      .then((canvas) => {
        const link = document.createElement('a');
        link.download = currentEmp
          ? `carte-professionnelle-${currentEmp.matricule}.png`
          : 'carte-professionnelle.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      })
      .catch((err) => {
        console.error('Erreur téléchargement carte html2canvas:', err);
      })
      .finally(() => {
        setIsExporting(false);
      });
  }

  const handlePrint = () => {
    window.print();
  };

  const getInitialPhotoSrc = () => {
    if (!currentEmp) return '';
    return (
      currentEmp.photo ||
      currentEmp.photo_url ||
      generateDefaultAvatarSvgDataUri(
        currentEmp.prenom || currentEmp.nom_complet.split(' ')[0] || 'Salarié',
        currentEmp.nom || currentEmp.nom_complet.split(' ')[1] || 'Atlantic',
        currentEmp.matricule
      )
    );
  };

  // Keep #cardPhoto synced when switching employee if no manual override
  useEffect(() => {
    const photoEl = document.getElementById('cardPhoto') as HTMLImageElement;
    if (photoEl && currentEmp) {
      photoEl.src = getInitialPhotoSrc();
    }
  }, [currentEmp]);

  // Exact standalone code snippet for export/reuse
  const standaloneSnippet = `<!-- Structure de la carte professionnelle CR-80 Atlantic Transport -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>

<style>
  .card-container {
    width: 537px; height: 338px;
    background-color: #0b2240; border-radius: 12px;
    position: relative; color: #ffffff; overflow: hidden;
    border: 1px solid rgba(255,255,255,0.1);
    box-sizing: border-box;
    font-family: Arial, sans-serif;
  }
  .card-header { background: rgba(0,0,0,0.2); padding: 16px 24px; border-bottom: 3px solid #cca333; }
  .company-name { font-size: 22px; font-weight: 800; text-transform: uppercase; margin: 0; color: #ffffff; }
  .card-title { font-size: 11px; color: #cca333; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
  .card-body { display: flex; padding: 24px; justify-content: space-between; align-items: center; height: calc(100% - 115px); box-sizing: border-box; }
  .photo-container { width: 110px; height: 135px; border: 2px solid #cca333; border-radius: 6px; overflow: hidden; background: #08162b; flex-shrink: 0; }
  .photo-container img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .info-container { flex: 1; padding: 0 20px; }
  .info-label { font-size: 10px; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .info-value { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #ffffff; }
  .qr-container { background: white; padding: 6px; border-radius: 6px; flex-shrink: 0; }
  .card-footer { position: absolute; bottom: 0; width: 100%; background: rgba(0,0,0,0.3); padding: 10px 24px; font-size: 10px; color: #a0aec0; box-sizing: border-box; }
</style>

<div class="card-container" id="bizCard">
  <div class="card-header">
    <h2 class="company-name">${settings.company_name || 'ATLANTIC TRANSPORT LTD'}</h2>
    <p class="card-title">CARTE D'IDENTIFICATION PROFESSIONNELLE</p>
  </div>
  <div class="card-body">
    <div class="photo-container">
      <img id="cardPhoto" src="${getInitialPhotoSrc()}" alt="Photo Salarié" />
    </div>
    <div class="info-container">
      <div class="info-label">Nom & Prénom</div>
      <div class="info-value">${currentEmp ? currentEmp.nom_complet : 'NOM SALARIÉ'}</div>
      <div class="info-label">Matricule</div>
      <div class="info-value" style="color: #cca333;">${currentEmp ? currentEmp.matricule : 'AT-2026-001'}</div>
      <div class="info-label">Poste</div>
      <div class="info-value" style="font-size: 15px;">${currentEmp ? currentEmp.poste : 'Conducteur Routier'}</div>
    </div>
    <div class="qr-container">
      <img src="${qrDataUrl}" width="85" height="85" alt="QR Code Portail" />
    </div>
  </div>
  <div class="card-footer">
    ${companyConfig.companyAddress} · Tél: ${companyConfig.primaryPhone} · Email: ${companyConfig.primaryEmail}
  </div>
</div>

<script>
  function loadPhoto(event) {
    var reader = new FileReader();
    reader.onload = function() {
      document.getElementById('cardPhoto').src = reader.result;
    }
    reader.readAsDataURL(event.target.files[0]);
  }

  function downloadCard() {
    const card = document.getElementById("bizCard");
    html2canvas(card, { scale: 3, useCORS: true, allowTaint: false }).then(canvas => {
      let link = document.createElement('a');
      link.download = 'carte-professionnelle.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  }
<\/script>`;

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(standaloneSnippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2500);
    } catch (err) {
      console.warn('Erreur copie snippet:', err);
    }
  };

  if (!isOpen || !currentEmp) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white">
      {/* Embedded Exact CSS styles for CR-80 card standard */}
      <style>{`
        .card-container {
          width: 537px;
          height: 338px;
          background-color: #0b2240;
          border-radius: 12px;
          position: relative;
          color: #ffffff;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1);
          box-sizing: border-box;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        .card-header {
          background: rgba(0,0,0,0.2);
          padding: 16px 24px;
          border-bottom: 3px solid #cca333;
        }
        .company-name {
          font-size: 22px;
          font-weight: 800;
          text-transform: uppercase;
          margin: 0;
          letter-spacing: 0.5px;
          color: #ffffff;
        }
        .card-title {
          font-size: 11px;
          color: #cca333;
          font-weight: 700;
          margin: 4px 0 0 0;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .card-body {
          display: flex;
          padding: 24px;
          justify-content: space-between;
          align-items: center;
          height: calc(100% - 115px);
          box-sizing: border-box;
        }
        .photo-container {
          width: 110px;
          height: 135px;
          border: 2px solid #cca333;
          border-radius: 6px;
          overflow: hidden;
          background: #08162b;
          flex-shrink: 0;
        }
        .photo-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .info-container {
          flex: 1;
          padding: 0 20px;
          text-align: left;
        }
        .info-label {
          font-size: 10px;
          color: #a0aec0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .info-value {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #ffffff;
        }
        .qr-container {
          background: white;
          padding: 6px;
          border-radius: 6px;
          flex-shrink: 0;
        }
        .card-footer {
          position: absolute;
          bottom: 0;
          width: 100%;
          background: rgba(0,0,0,0.3);
          padding: 10px 24px;
          font-size: 10px;
          color: #a0aec0;
          box-sizing: border-box;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col print:border-none print:shadow-none print:max-w-none print:max-h-none">
        {/* Header */}
        <div className="bg-[#0B2545] text-white p-5 sm:p-6 flex items-center justify-between gap-4 border-b border-amber-400/30 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase text-amber-400 font-bold">
                Module Format CR-80 Sécurisé
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Générateur de Carte Professionnelle (Anti-Bug Photo Base64)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Action Controls & Salarié Selector */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" />
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                Salarié :
              </label>
              <select
                value={currentEmp.id}
                onChange={(e) => {
                  const found = employees.find((emp) => emp.id === Number(e.target.value));
                  if (found) {
                    setCurrentEmp(found);
                    if (onSelectEmployee) onSelectEmployee(found);
                  }
                }}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs sm:text-sm bg-white font-medium focus:border-[#0B2545] focus:outline-none"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.matricule} - {emp.nom_complet} ({emp.poste})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Photo Upload with FileReader logic */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={loadPhoto}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Téléverser une photo via FileReader (évite tout bug d'image blanche)"
            >
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              <span>Changer la photo (FileReader)</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Flip recto / verso */}
            <button
              type="button"
              onClick={() => setActiveSide(activeSide === 'recto' ? 'verso' : 'recto')}
              className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-600" />
              <span>{activeSide === 'recto' ? 'Afficher Verso' : 'Afficher Recto'}</span>
            </button>

            {/* Print button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Imprimer</span>
            </button>

            {/* Exact Download Button with html2canvas */}
            <button
              type="button"
              onClick={downloadCard}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Capture scale:3...' : 'Télécharger la carte (PNG)'}</span>
            </button>

            {/* View Raw Snippet */}
            <button
              type="button"
              onClick={() => setShowCodeSnippet(!showCodeSnippet)}
              className="px-3 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Code Source CR-80</span>
            </button>
          </div>
        </div>

        {/* Main Card Viewport */}
        <div className="p-6 sm:p-10 flex flex-col items-center justify-center bg-slate-200/75 overflow-y-auto flex-1">
          {/* CR-80 Card Element with EXACT id="bizCard" and class "card-container" */}
          {activeSide === 'recto' ? (
            <div id="bizCard" className="card-container shadow-2xl">
              <div className="card-header">
                <h2 className="company-name">{settings.company_name || 'ATLANTIC TRANSPORT LTD'}</h2>
                <p className="card-title">CARTE D&apos;IDENTIFICATION PROFESSIONNELLE</p>
              </div>

              <div className="card-body">
                <div className="photo-container">
                  <img
                    id="cardPhoto"
                    src={getInitialPhotoSrc()}
                    alt="Salarié"
                    crossOrigin="anonymous"
                  />
                </div>

                <div className="info-container">
                  <div className="info-label">Nom &amp; Prénom</div>
                  <div className="info-value">{currentEmp.nom_complet}</div>

                  <div className="info-label">Matricule</div>
                  <div className="info-value" style={{ color: '#cca333' }}>
                    {currentEmp.matricule}
                  </div>

                  <div className="info-label">Poste</div>
                  <div
                    className="info-value"
                    style={{ fontSize: '15px', marginBottom: '0px' }}
                  >
                    {currentEmp.poste}
                  </div>
                </div>

                <div className="qr-container">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code ${currentEmp.matricule}`}
                      style={{ width: '85px', height: '85px', display: 'block' }}
                    />
                  ) : (
                    <div className="w-[85px] h-[85px] flex items-center justify-center">
                      <QrCode className="w-6 h-6 text-slate-400 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              <div className="card-footer">
                {companyConfig.companyAddress} · Tél: {companyConfig.primaryPhone} · Email: {companyConfig.primaryEmail}
              </div>
            </div>
          ) : (
            /* VERSO */
            <div className="card-container shadow-2xl" style={{ padding: '24px' }}>
              <div className="border-b border-slate-600 pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {settings.company_name || 'ATLANTIC TRANSPORT LTD'}
                  </h3>
                  <span className="text-[10px] text-[#cca333] font-semibold">
                    REGULATION INTERNATIONALE · CBSA / OEA
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-300">
                  NE: {companyConfig.enterpriseNumber}
                </span>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-300 mb-4">
                Cette carte est la propriété exclusive de la direction d&apos;Atlantic Transport Ltd.
                Elle doit être présentée lors de tout contrôle d&apos;accès, chargement, douanes et expéditions.
                En cas de perte, prière de contacter immédiatement la direction générale.
              </p>

              <div className="bg-slate-900/60 rounded-lg p-3 text-[11px] space-y-1.5 border border-slate-700/60 mb-4">
                <div>
                  <strong className="text-white">Adresse Siège :</strong>{' '}
                  <span className="text-slate-300">{companyConfig.companyAddress}</span>
                </div>
                <div>
                  <strong className="text-white">Téléphone Contact :</strong>{' '}
                  <span className="text-amber-400 font-mono">{companyConfig.primaryPhone}</span>
                </div>
                <div>
                  <strong className="text-white">Email Officiel :</strong>{' '}
                  <span className="text-sky-300 font-mono">{companyConfig.primaryEmail}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-700">
                <span>Date d&apos;embauche : {currentEmp.date_embauche || '2026-03-01'}</span>
                <span className="font-mono">www.atlantictransportltd.ca</span>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 mt-4 text-center print:hidden">
            Format standard CR-80 (537px x 338px) · Rendu haute résolution (scale: 3) sans bug de photo blanche.
          </p>

          {/* Standalone Code Snippet Drawer */}
          {showCodeSnippet && (
            <div className="mt-6 w-full max-w-[537px] bg-slate-900 rounded-xl p-4 text-white text-xs font-mono border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold">Code source HTML / CSS / JS exact :</span>
                <button
                  type="button"
                  onClick={handleCopySnippet}
                  className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier le code</span>
                    </>
                  )}
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto bg-slate-950 p-3 rounded text-[11px] text-slate-300">
                <pre className="whitespace-pre-wrap">{standaloneSnippet}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between text-xs text-slate-600 print:hidden">
          <div>
            Salarié : <strong className="text-slate-900">{currentEmp.nom_complet}</strong> ({currentEmp.matricule})
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
