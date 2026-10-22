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
  Code,
  Calendar,
  Sparkles,
  ShieldCheck,
  Building2,
  RefreshCw
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
  const [customJobTitle, setCustomJobTitle] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('12/2025');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (employee) {
      setCurrentEmp(employee);
    } else if (!currentEmp && employees.length > 0) {
      setCurrentEmp(employees[0]);
    }
  }, [employee, employees]);

  useEffect(() => {
    if (currentEmp) {
      setCustomJobTitle(currentEmp.poste || 'CHAUFFEUR ROUTIER');
      // Format delivery date (e.g. MM/YYYY from date_effet or date_embauche)
      const rawDate = currentEmp.date_effet || currentEmp.date_embauche;
      if (rawDate && rawDate.includes('-')) {
        const parts = rawDate.split('-');
        if (parts.length >= 2) {
          setDeliveryDate(`${parts[1]}/${parts[0]}`);
        }
      } else {
        setDeliveryDate('03/2026');
      }
    }
  }, [currentEmp]);

  // Generate dynamic QR Code pointing to the employee's online personal portal
  useEffect(() => {
    if (!currentEmp) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://atlantictransportltd.ca';
    const targetUrl = `${origin}/?matricule=${encodeURIComponent(currentEmp.matricule)}&token=${encodeURIComponent(currentEmp.access_token || currentEmp.matricule)}`;

    QRCode.toDataURL(targetUrl, {
      width: 256,
      margin: 1,
      color: {
        dark: '#000000',
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

  // Safe color converter to guarantee html2canvas never receives unsupported oklch / oklab color functions
  const sanitizeColorString = (str: string): string => {
    if (!str || typeof str !== 'string') return str;
    if (!str.includes('oklch') && !str.includes('oklab') && !str.includes('color(')) {
      return str;
    }
    const helperCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (helperCanvas) {
      helperCanvas.width = 1;
      helperCanvas.height = 1;
    }
    const helperCtx = helperCanvas ? helperCanvas.getContext('2d', { willReadFrequently: true }) : null;

    return str.replace(/(?:oklch|oklab|color)\([^)]+\)/g, (match) => {
      try {
        if (!helperCtx) return '#000000';
        helperCtx.fillStyle = '#000000';
        helperCtx.fillStyle = match;
        return helperCtx.fillStyle || match;
      } catch {
        return '#000000';
      }
    });
  };

  // Exact function requested by the user: html2canvas with scale 3, useCORS: true, allowTaint: false
  // Enhanced with anti-oklch interceptors to support modern Tailwind CSS v4 without crashing
  function downloadCard() {
    const card = document.getElementById('bizCard');
    if (!card) return;
    setIsExporting(true);

    // Temporarily wrap window.getComputedStyle to intercept modern oklch colors that html2canvas cannot parse
    const origGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
      const style = origGetComputedStyle.call(window, elt, pseudoElt);
      return new Proxy(style, {
        get(target, prop, receiver) {
          if (prop === 'getPropertyValue') {
            return function (propertyName: string) {
              const val = target.getPropertyValue(propertyName);
              return sanitizeColorString(val);
            };
          }
          const val = Reflect.get(target, prop, receiver);
          if (typeof val === 'string') {
            return sanitizeColorString(val);
          }
          if (typeof val === 'function') {
            return val.bind(target);
          }
          return val;
        }
      });
    } as typeof window.getComputedStyle;

    html2canvas(card, {
      scale: 3,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      onclone: (clonedDoc, clonedElement) => {
        // Wrap cloned document's getComputedStyle if it has its own window context
        if (clonedDoc.defaultView && clonedDoc.defaultView !== window) {
          const clonedOrigGetComputedStyle = clonedDoc.defaultView.getComputedStyle;
          clonedDoc.defaultView.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
            const style = clonedOrigGetComputedStyle.call(clonedDoc.defaultView, elt, pseudoElt);
            return new Proxy(style, {
              get(target, prop, receiver) {
                if (prop === 'getPropertyValue') {
                  return function (propertyName: string) {
                    const val = target.getPropertyValue(propertyName);
                    return sanitizeColorString(val);
                  };
                }
                const val = Reflect.get(target, prop, receiver);
                if (typeof val === 'string') {
                  return sanitizeColorString(val);
                }
                if (typeof val === 'function') {
                  return val.bind(target);
                }
                return val;
              }
            });
          } as typeof window.getComputedStyle;
        }

        // Ensure root and body in cloned iframe have safe hex colors
        if (clonedDoc.documentElement) {
          clonedDoc.documentElement.style.backgroundColor = '#ffffff';
          clonedDoc.documentElement.style.color = '#000000';
        }
        if (clonedDoc.body) {
          clonedDoc.body.style.backgroundColor = '#ffffff';
          clonedDoc.body.style.color = '#000000';
        }

        // Sanitize every cloned node in the badge DOM tree
        const allClonedNodes = [clonedElement, ...Array.from(clonedElement.querySelectorAll('*'))] as HTMLElement[];
        for (const node of allClonedNodes) {
          if (!node || !node.style) continue;
          try {
            const computed = (clonedDoc.defaultView || window).getComputedStyle(node);
            const colorKeys = [
              'backgroundColor',
              'color',
              'borderColor',
              'borderTopColor',
              'borderRightColor',
              'borderBottomColor',
              'borderLeftColor',
              'outlineColor'
            ] as const;

            for (const key of colorKeys) {
              const currentVal = computed[key];
              if (currentVal && (currentVal.includes('oklch') || currentVal.includes('color('))) {
                node.style[key] = sanitizeColorString(currentVal);
              }
            }

            if (computed.boxShadow && (computed.boxShadow.includes('oklch') || computed.boxShadow.includes('color('))) {
              node.style.boxShadow = sanitizeColorString(computed.boxShadow);
            }
            if (computed.textShadow && (computed.textShadow.includes('oklch') || computed.textShadow.includes('color('))) {
              node.style.textShadow = sanitizeColorString(computed.textShadow);
            }
          } catch {
            // ignore
          }
        }
      }
    })
      .then((canvas) => {
        const link = document.createElement('a');
        link.download = currentEmp
          ? `carte-professionnelle-${currentEmp.matricule}-${activeSide}.png`
          : `carte-professionnelle-${activeSide}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      })
      .catch((err) => {
        console.error('Erreur téléchargement carte html2canvas:', err);
      })
      .finally(() => {
        // Always restore original window.getComputedStyle
        window.getComputedStyle = origGetComputedStyle;
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

  // Split name for optimal two-line layout if space permits
  const formatNameParts = (fullName: string) => {
    const trimmed = (fullName || 'SARAH J. NGUYEN').trim();
    const parts = trimmed.split(' ');
    if (parts.length === 1) {
      return { line1: parts[0].toUpperCase(), line2: '' };
    }
    if (parts.length === 2) {
      return { line1: parts[0].toUpperCase(), line2: parts[1].toUpperCase() };
    }
    // More than 2 parts: e.g. "SARAH J. NGUYEN" -> line1: "SARAH J.", line2: "NGUYEN"
    const line2 = parts[parts.length - 1].toUpperCase();
    const line1 = parts.slice(0, parts.length - 1).join(' ').toUpperCase();
    return { line1, line2 };
  };

  const nameParts = currentEmp ? formatNameParts(currentEmp.nom_complet) : { line1: 'SARAH J.', line2: 'NGUYEN' };

  // Calculate dynamic font size for rotated job title based on length
  const jobTitleText = (customJobTitle || currentEmp?.poste || 'JOB TITLE').toUpperCase();
  const getJobTitleFontSize = (len: number) => {
    if (len > 24) return '15px';
    if (len > 18) return '17px';
    if (len > 14) return '19px';
    if (len > 10) return '22px';
    return '24px';
  };

  // Standalone code snippet for user to copy / embed
  const standaloneSnippet = `<!-- CARTE PROFESSIONNELLE VERTICALE (CR-80 PORTRAIT) - ATLANTIC TRANSPORT -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>

<style>
  .badge-card {
    width: 370px;
    height: 585px;
    background: #ffffff;
    border-radius: 20px;
    position: relative;
    box-shadow: 0 15px 35px rgba(0,0,0,0.15);
    border: 1px solid #d1d5db;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    display: flex;
    box-sizing: border-box;
  }
  .badge-lanyard-slot {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    width: 56px;
    height: 12px;
    background: #cbd5e1;
    border-radius: 9999px;
    border: 1.5px solid #94a3b8;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.35);
    z-index: 20;
  }
  .badge-sidebar {
    width: 92px;
    height: 100%;
    background-color: #0d1117;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
  }
  .badge-job-title {
    transform: rotate(90deg);
    white-space: nowrap;
    color: #ffffff;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    font-size: ${getJobTitleFontSize(jobTitleText.length)};
  }
  .badge-main {
    flex: 1;
    height: 100%;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 38px 18px 16px 18px;
    box-sizing: border-box;
    text-align: center;
    position: relative;
  }
  .badge-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .badge-logo-circle {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2px solid #0b2545;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 14px;
    color: #0b2545;
    background: #f8fafc;
  }
  .badge-brand-text {
    text-align: left;
    line-height: 1.1;
  }
  .badge-brand-title {
    font-size: 16px;
    font-weight: 900;
    color: #0b2545;
    letter-spacing: 0.04em;
    margin: 0;
  }
  .badge-brand-sub {
    font-size: 12px;
    font-weight: 800;
    color: #1e293b;
    letter-spacing: 0.12em;
    margin: 0;
  }
  .badge-photo-frame {
    width: 146px;
    height: 172px;
    border: 2.5px solid #111111;
    overflow: hidden;
    background: #f1f5f9;
    margin-bottom: 12px;
  }
  .badge-photo-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .badge-name {
    font-size: 19px;
    font-weight: 900;
    color: #0f172a;
    line-height: 1.15;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .badge-qr-box {
    margin-bottom: 8px;
  }
  .badge-qr-box img {
    width: 82px;
    height: 82px;
    display: block;
    margin: 0 auto;
  }
  .badge-info-section {
    font-size: 10.5px;
    color: #334155;
    line-height: 1.35;
  }
  .badge-info-title {
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 3px;
    font-size: 11px;
  }
</style>

<div class="badge-card" id="bizCard">
  <div class="badge-lanyard-slot"></div>
  <div class="badge-sidebar">
    <div class="badge-job-title">${jobTitleText}</div>
  </div>
  <div class="badge-main">
    <div class="badge-header">
      <div class="badge-logo-circle">AT</div>
      <div class="badge-brand-text">
        <h2 class="badge-brand-title">${settings.company_name?.split(' ')[0] || 'ATLANTIC'}</h2>
        <p class="badge-brand-sub">TRANSPORT SYSTEMS</p>
      </div>
    </div>
    <div class="badge-photo-frame">
      <img id="cardPhoto" src="${getInitialPhotoSrc()}" alt="Photo Salarié" />
    </div>
    <div class="badge-name">
      <div>${nameParts.line1}</div>
      ${nameParts.line2 ? `<div>${nameParts.line2}</div>` : ''}
    </div>
    <div class="badge-qr-box">
      <img src="${qrDataUrl}" width="82" height="82" alt="QR Code Portail" />
    </div>
    <div class="badge-info-section">
      <div class="badge-info-title">Informations Complémentaires</div>
      <div>Matricule: ${currentEmp ? currentEmp.matricule : 'AT-2026-001'}</div>
      <div>Service: ${currentEmp?.departement || currentEmp?.poste || 'Logistique & Transport'}</div>
      <div>Délivrée: ${deliveryDate}</div>
    </div>
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
      link.download = 'carte-professionnelle-${currentEmp?.matricule || 'salarié'}.png';
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white">
      {/* Exact CSS embedded for crisp rendering and html2canvas snapshot */}
      <style>{`
        .vertical-badge-card {
          width: 370px;
          height: 585px;
          background: #ffffff;
          border-radius: 20px;
          position: relative;
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.3);
          border: 1px solid #d1d5db;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          display: flex;
          box-sizing: border-box;
          user-select: none;
        }

        .badge-lanyard-slot {
          position: absolute;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          width: 56px;
          height: 12px;
          background: #cbd5e1;
          border-radius: 9999px;
          border: 1.5px solid #94a3b8;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);
          z-index: 30;
        }

        .badge-sidebar {
          width: 94px;
          height: 100%;
          background-color: #0e1217;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          border-right: 1px solid rgba(0,0,0,0.1);
        }

        .badge-job-title {
          transform: rotate(90deg);
          white-space: nowrap;
          color: #ffffff;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }

        .badge-main {
          flex: 1;
          height: 100%;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 36px 18px 16px 18px;
          box-sizing: border-box;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        /* Subtle luxury security sheen / guilloche pattern */
        .badge-security-sheen {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 80% 20%, rgba(220, 235, 255, 0.45) 0%, rgba(255, 245, 235, 0.2) 50%, transparent 80%);
          opacity: 0.8;
          z-index: 1;
        }

        .badge-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 12px;
          position: relative;
          z-index: 2;
        }

        .badge-logo-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2px solid #0b2545;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 14px;
          color: #0b2545;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          flex-shrink: 0;
        }

        .badge-brand-text {
          text-align: left;
          line-height: 1.1;
        }

        .badge-brand-title {
          font-size: 16px;
          font-weight: 900;
          color: #0b2545;
          letter-spacing: 0.04em;
          margin: 0;
        }

        .badge-brand-sub {
          font-size: 11px;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: 0.14em;
          margin: 0;
        }

        .badge-photo-frame {
          width: 144px;
          height: 172px;
          border: 2.5px solid #111111;
          overflow: hidden;
          background: #f8fafc;
          margin-bottom: 12px;
          position: relative;
          z-index: 2;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }

        .badge-photo-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .badge-name {
          font-size: 18.5px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.15;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          position: relative;
          z-index: 2;
        }

        .badge-qr-box {
          margin-bottom: 8px;
          position: relative;
          z-index: 2;
          background: #ffffff;
          padding: 2px;
          border-radius: 4px;
        }

        .badge-qr-box img {
          width: 80px;
          height: 80px;
          display: block;
          margin: 0 auto;
        }

        .badge-info-section {
          font-size: 10.5px;
          color: #334155;
          line-height: 1.35;
          position: relative;
          z-index: 2;
        }

        .badge-info-title {
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 3px;
          font-size: 11px;
          letter-spacing: 0.01em;
        }

        .badge-info-item {
          color: #475569;
        }

        .badge-info-strong {
          color: #0f172a;
          font-weight: 600;
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-w-none print:max-h-none">
        {/* Modal Header */}
        <div className="bg-[#0B2545] text-white p-4 sm:p-5 flex items-center justify-between gap-4 border-b border-amber-400/30 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                  Format Officiel CR-80 Vertical (Modèle Image Référence)
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Anti-Bug Photo Base64
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                Générateur de Carte Professionnelle Haute Définition
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
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600 shrink-0" />
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
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs sm:text-sm bg-white font-medium focus:border-[#0B2545] focus:outline-none max-w-[240px] truncate"
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
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Téléverser une photo via FileReader (évite tout bug d'image blanche)"
            >
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              <span>Changer photo</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Flip recto / verso */}
            <button
              type="button"
              onClick={() => setActiveSide(activeSide === 'recto' ? 'verso' : 'recto')}
              className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-600" />
              <span>{activeSide === 'recto' ? 'Afficher Verso' : 'Afficher Recto'}</span>
            </button>

            {/* Print button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Imprimer</span>
            </button>

            {/* Exact Download Button with html2canvas scale: 3 */}
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
              className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Code Source CR-80</span>
            </button>
          </div>
        </div>

        {/* Live Adjustments Bar */}
        <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center gap-3 text-xs print:hidden">
          <span className="text-slate-500 font-semibold">Personnalisation rapide :</span>
          <div className="flex items-center gap-1.5">
            <label className="text-slate-600 font-medium">Bandeau Titre :</label>
            <input
              type="text"
              value={customJobTitle}
              onChange={(e) => setCustomJobTitle(e.target.value)}
              placeholder="Ex: CHAUFFEUR ROUTIER"
              className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold uppercase w-48 text-[#0B2545]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-slate-600 font-medium">Délivrée le :</label>
            <input
              type="text"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              placeholder="Ex: 12/2025"
              className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold w-24 text-[#0B2545]"
            />
          </div>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono ml-auto">
            Matricule: {currentEmp.matricule}
          </span>
        </div>

        {/* Main Card Viewport */}
        <div className="p-4 sm:p-8 flex flex-col items-center justify-center bg-slate-200/90 overflow-y-auto flex-1">
          {/* CR-80 Vertical Card Element with EXACT id="bizCard" matching the user's uploaded reference */}
          {activeSide === 'recto' ? (
            <div id="bizCard" className="vertical-badge-card" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
              {/* Top Lanyard Slot Cutout */}
              <div className="badge-lanyard-slot" title="Fente pour clip tour de cou" />

              {/* Left Dark Sidebar with Vertically Rotated Job Title */}
              <div className="badge-sidebar">
                <div
                  className="badge-job-title"
                  style={{ fontSize: getJobTitleFontSize(jobTitleText.length) }}
                >
                  {jobTitleText}
                </div>
              </div>

              {/* Main White Content Area */}
              <div className="badge-main" style={{ backgroundColor: '#ffffff' }}>
                {/* Security Iridescent Sheen Effect */}
                <div className="badge-security-sheen" />

                {/* Company Header */}
                <div className="badge-header">
                  {/* Circular Logo Emblem */}
                  <div className="badge-logo-circle" style={{ backgroundColor: '#ffffff', color: '#0b2545', borderColor: '#0b2545' }}>
                    <svg viewBox="0 0 32 32" style={{ width: '24px', height: '24px', color: '#0b2545' }} fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="16" cy="16" r="14" stroke="#0b2545" strokeWidth="1.5" />
                      <ellipse cx="16" cy="16" rx="6" ry="14" stroke="#0b2545" strokeWidth="1.2" />
                      <line x1="2" y1="16" x2="30" y2="16" stroke="#0b2545" strokeWidth="1.2" />
                      <line x1="5" y1="9" x2="27" y2="9" stroke="#0b2545" strokeWidth="0.8" />
                      <line x1="5" y1="23" x2="27" y2="23" stroke="#0b2545" strokeWidth="0.8" />
                    </svg>
                  </div>
                  <div className="badge-brand-text">
                    <h2 className="badge-brand-title" style={{ color: '#0b2545' }}>
                      {settings.company_name?.split(' ')[0] || 'ATLANTIC'}
                    </h2>
                    <p className="badge-brand-sub" style={{ color: '#1e293b' }}>TRANSPORT SYSTEMS</p>
                  </div>
                </div>

                {/* Employee Portrait Photo Container */}
                <div className="badge-photo-frame" style={{ borderColor: '#111111', backgroundColor: '#f8fafc' }}>
                  <img
                    id="cardPhoto"
                    src={getInitialPhotoSrc()}
                    alt={currentEmp.nom_complet}
                    crossOrigin="anonymous"
                  />
                </div>

                {/* Employee Full Name */}
                <div className="badge-name" style={{ color: '#0f172a' }}>
                  <div>{nameParts.line1}</div>
                  {nameParts.line2 && <div>{nameParts.line2}</div>}
                </div>

                {/* Dynamic QR Code */}
                <div className="badge-qr-box" style={{ backgroundColor: '#ffffff' }}>
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code ${currentEmp.matricule}`}
                      style={{ width: '80px', height: '80px', display: 'block', margin: '0 auto' }}
                    />
                  ) : (
                    <div style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>
                      <QrCode style={{ width: '24px', height: '24px', color: '#94a3b8' }} />
                    </div>
                  )}
                </div>

                {/* Additional Information Footer */}
                <div className="badge-info-section" style={{ color: '#334155' }}>
                  <div className="badge-info-title" style={{ color: '#0f172a' }}>Informations Complémentaires</div>
                  <div className="badge-info-item" style={{ color: '#475569' }}>
                    Matricule: <span className="badge-info-strong" style={{ color: '#0f172a', fontFamily: 'monospace' }}>{currentEmp.matricule}</span>
                  </div>
                  <div className="badge-info-item" style={{ color: '#475569' }}>
                    Service: <span className="badge-info-strong" style={{ color: '#0f172a' }}>{currentEmp.departement || currentEmp.poste}</span>
                  </div>
                  <div className="badge-info-item" style={{ color: '#475569' }}>
                    Délivrée: <span className="badge-info-strong" style={{ color: '#0f172a', fontFamily: 'monospace' }}>{deliveryDate}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* VERSO (REVERSE SIDE) */
            <div id="bizCard" className="vertical-badge-card" style={{ flexDirection: 'column', padding: '0', backgroundColor: '#ffffff', color: '#0f172a' }}>
              {/* Top Lanyard Slot Cutout */}
              <div className="badge-lanyard-slot" />

              <div style={{ backgroundColor: '#0b2545', color: '#ffffff', padding: '40px 20px 20px 20px', textAlign: 'center', borderBottom: '2px solid #fbbf24' }}>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.15em', color: '#fbbf24', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  RÉGULATION INTERNATIONALE CBSA / OEA
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                  {settings.company_name || 'ATLANTIC TRANSPORT LTD'}
                </h3>
                <p style={{ fontSize: '11px', color: '#cbd5e1', margin: '4px 0 0 0' }}>
                  Systèmes de Gestion &amp; Logistique Multimodale
                </p>
              </div>

              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left', fontSize: '12px', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', fontSize: '11px', color: '#334155', lineHeight: 1.5 }}>
                    <p style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px', margin: '0 0 4px 0' }}>CONDITIONS D&apos;UTILISATION :</p>
                    Cette carte est strictement personnelle et demeure la propriété exclusive d&apos;
                    <strong style={{ color: '#0f172a' }}> {settings.company_name || 'Atlantic Transport Ltd'}</strong>. Elle doit être
                    présentée à toute réquisition des autorités portuaires, douanières et aéroportuaires.
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', borderLeft: '2px solid #0b2545', paddingLeft: '12px', paddingTop: '2px', paddingBottom: '2px' }}>
                    <div>
                      <strong style={{ color: '#0f172a' }}>Siège social :</strong>{' '}
                      <span style={{ color: '#475569' }}>{companyConfig.companyAddress}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#0f172a' }}>Tél. d&apos;urgence :</strong>{' '}
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#0b2545' }}>{companyConfig.primaryPhone}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#0f172a' }}>Email RH :</strong>{' '}
                      <span style={{ fontFamily: 'monospace', color: '#334155' }}>{companyConfig.primaryEmail}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#0f172a' }}>NEQ / Entreprise :</strong>{' '}
                      <span style={{ fontFamily: 'monospace', color: '#334155' }}>{companyConfig.enterpriseNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Barcode simulation & return notice */}
                <div style={{ paddingTop: '12px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'monospace', color: '#1e293b', letterSpacing: '0.25em', fontSize: '18px', fontWeight: 'bold' }}>
                    ||| | ||||| || |||| ||| ||||
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace', marginTop: '4px' }}>
                    ID-VALIDITY-{currentEmp.matricule}
                  </div>
                  <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '8px', margin: '8px 0 0 0' }}>
                    En cas de perte, merci de retourner cette carte au poste de garde ou à la direction.
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-600 mt-4 text-center print:hidden">
            Format vertical officiel CR-80 (370px × 585px) · Rendu haute résolution (scale: 3) sans bug de photo blanche.
          </p>

          {/* Standalone Code Snippet Drawer */}
          {showCodeSnippet && (
            <div className="mt-5 w-full max-w-xl bg-slate-900 rounded-xl p-4 text-white text-xs font-mono border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold">Code source HTML / CSS / JS vertical :</span>
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
        <div className="bg-slate-50 border-t border-slate-200 p-3 px-6 flex items-center justify-between text-xs text-slate-600 print:hidden">
          <div>
            Salarié sélectionné : <strong className="text-slate-900">{currentEmp.nom_complet}</strong> ({currentEmp.matricule})
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
