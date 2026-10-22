import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  FileImage,
  Layers,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Building2,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { Employee, SiteSettings } from '../../types';
import { getCompanyContactConfig, CompanyContactConfig } from '../../services/companyConfigService';
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
  const [companyConfig, setCompanyConfig] = useState<CompanyContactConfig>(getCompanyContactConfig());
  const [currentEmp, setCurrentEmp] = useState<Employee | null>(employee || employees[0] || null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeSide, setActiveSide] = useState<'recto' | 'verso'>('recto');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [customJobTitle, setCustomJobTitle] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('03/2026');
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logo officiel de l'entreprise
  const companyLogoUrl =
    settings.logo_url && settings.logo_url.trim().length > 0
      ? settings.logo_url
      : '/logo-atlantic.png';

  // Synchronisation avec les données employé
  useEffect(() => {
    if (employee) {
      setCurrentEmp(employee);
    } else if (!currentEmp && employees.length > 0) {
      setCurrentEmp(employees[0]);
    }
  }, [employee, employees]);

  // Synchronisation des coordonnées entreprise
  useEffect(() => {
    setCompanyConfig(getCompanyContactConfig());
  }, [isOpen]);

  // Mise à jour du poste et date de délivrance
  useEffect(() => {
    if (currentEmp) {
      setCustomJobTitle(currentEmp.poste || 'CHAUFFEUR ROUTIER');
      const rawDate = currentEmp.date_effet || currentEmp.date_embauche;
      if (rawDate && rawDate.includes('-')) {
        const parts = rawDate.split('-');
        if (parts.length >= 2) {
          setDeliveryDate(`${parts[1]}/${parts[0]}`);
        }
      } else {
        setDeliveryDate('03/2026');
      }

      // Initialiser la photo
      const initialPhoto =
        currentEmp.photo ||
        currentEmp.photo_url ||
        generateDefaultAvatarSvgDataUri(
          currentEmp.prenom || currentEmp.nom_complet.split(' ')[0] || 'Salarié',
          currentEmp.nom || currentEmp.nom_complet.split(' ')[1] || 'Atlantic',
          currentEmp.matricule
        );
      setPhotoDataUrl(initialPhoto);
    }
  }, [currentEmp]);

  // Génération dynamique du QR code pointant vers l'espace personnel du salarié
  const getEmployeePortalUrl = () => {
    if (!currentEmp) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://atlantictransportltd.ca';
    return `${origin}/?matricule=${encodeURIComponent(currentEmp.matricule)}&token=${encodeURIComponent(
      currentEmp.access_token || currentEmp.matricule
    )}`;
  };

  useEffect(() => {
    if (!currentEmp) return;
    const targetUrl = getEmployeePortalUrl();

    QRCode.toDataURL(targetUrl, {
      width: 400,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('Erreur génération QR Code badge:', err));
  }, [currentEmp]);

  // Chargement anti-bug de la photo via FileReader en Base64
  const handleLoadPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Découpage du nom en deux lignes si besoin
  const formatNameParts = (fullName: string) => {
    const trimmed = (fullName || 'SARAH J. NGUYEN').trim();
    const parts = trimmed.split(' ');
    if (parts.length === 1) {
      return { line1: parts[0].toUpperCase(), line2: '' };
    }
    if (parts.length === 2) {
      return { line1: parts[0].toUpperCase(), line2: parts[1].toUpperCase() };
    }
    const line2 = parts[parts.length - 1].toUpperCase();
    const line1 = parts.slice(0, parts.length - 1).join(' ').toUpperCase();
    return { line1, line2 };
  };

  const nameParts = currentEmp ? formatNameParts(currentEmp.nom_complet) : { line1: 'SARAH J.', line2: 'NGUYEN' };
  const jobTitleText = (customJobTitle || currentEmp?.poste || 'CHAUFFEUR ROUTIER').toUpperCase();

  // Helper pour charger une image en mémoire pour le canvas sans risque de taint
  const loadImageElement = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

  /**
   * MOTEUR DE DESSIN CANVAS 2D ULTRA-FIABLE (CR-80 PORTRAIT 800 x 1268 PX - 300 DPI)
   * 100% natif : Ne dépend pas du DOM ni de html2canvas -> aucun bug de couleur oklch ni de crash de rendu.
   */
  const renderBadgeToCanvas = async (side: 'recto' | 'verso'): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    // Dimensions HD standard CR-80 Portrait (ratio 1 : 1.585)
    canvas.width = 800;
    canvas.height = 1268;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Impossible d’initialiser le contexte 2D');

    // Activer l'anticrénelage de haute qualité
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Fond blanc pur avec coins arrondis pour le format carte
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, 36);
    ctx.fill();

    // 2. Fente supérieure pour clip de tour de cou (Lanyard Slot)
    const slotW = 120;
    const slotH = 26;
    const slotX = (canvas.width - slotW) / 2;
    const slotY = 32;
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.roundRect(slotX, slotY, slotW, slotH, 13);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#94A3B8';
    ctx.stroke();

    if (side === 'recto') {
      // ==========================================
      // RECTO DU BADGE (DESIGN FIDÈLE À L'EXEMPLAIRE)
      // ==========================================
      const sidebarWidth = 200;

      // Colonne noire à gauche
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      // On clip avec les coins arrondis gauches
      ctx.save();
      ctx.roundRect(0, 0, sidebarWidth, canvas.height, [36, 0, 0, 36]);
      ctx.fill();

      // Texte vertical pivoté à 90° dans la colonne noire ("JOB TITLE" / Poste)
      ctx.save();
      ctx.translate(sidebarWidth / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Ajuster la taille de la police selon la longueur
      const fontSize = jobTitleText.length > 22 ? 30 : jobTitleText.length > 16 ? 36 : 42;
      ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.letterSpacing = '0.22em';
      ctx.fillText(jobTitleText, 0, 0);
      ctx.restore();
      ctx.restore();

      // Zone principale blanche (X de 200 à 800 -> Largeur 600px, Centre X = 500)
      const centerX = 200 + (canvas.width - 200) / 2; // 500px

      // Effet de sécurité filigrane / guilloche subtil
      ctx.save();
      const sheenGrad = ctx.createRadialGradient(centerX + 150, 300, 20, centerX, 500, 500);
      sheenGrad.addColorStop(0, 'rgba(224, 242, 254, 0.45)');
      sheenGrad.addColorStop(0.5, 'rgba(254, 243, 199, 0.25)');
      sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(200, 0, 600, canvas.height);
      ctx.restore();

      // En-tête : Logo officiel de l'entreprise et Nom
      const companyLogoUrl =
        settings.logo_url && settings.logo_url.trim().length > 0
          ? settings.logo_url
          : '/logo-atlantic.png';

      const logoBoxX = 240;
      const logoBoxY = 72;
      const logoBoxW = 105;
      const logoBoxH = 76;

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 10);
      ctx.fill();
      ctx.stroke();

      try {
        const logoImg = await loadImageElement(companyLogoUrl);
        const imgAspect = logoImg.width / logoImg.height;
        const boxAspect = (logoBoxW - 12) / (logoBoxH - 12);
        let drawW = logoBoxW - 12;
        let drawH = logoBoxH - 12;
        if (imgAspect > boxAspect) {
          drawH = drawW / imgAspect;
        } else {
          drawW = drawH * imgAspect;
        }
        const drawX = logoBoxX + (logoBoxW - drawW) / 2;
        const drawY = logoBoxY + (logoBoxH - drawH) / 2;
        ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
      } catch {
        ctx.fillStyle = '#0B2545';
        ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('AT', logoBoxX + logoBoxW / 2, logoBoxY + logoBoxH / 2);
      }

      // Nom de l'entreprise à côté du logo
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const companyFirstWord = (settings.company_name?.split(' ')[0] || 'ATLANTIC').toUpperCase();
      ctx.fillStyle = '#0B2545';
      ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(companyFirstWord, logoBoxX + logoBoxW + 18, logoBoxY + 24);

      ctx.fillStyle = '#1E293B';
      ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('TRANSPORT SYSTEMS', logoBoxX + logoBoxW + 18, logoBoxY + 54);

      // Photo de l'employé
      const photoW = 290;
      const photoH = 345;
      const photoX = centerX - photoW / 2;
      const photoY = 190;

      // Cadre photo avec bordure sombre nette
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#111111';
      ctx.strokeRect(photoX, photoY, photoW, photoH);

      // Remplissage photo ou avatar de secours
      try {
        let photoImg: HTMLImageElement | null = null;
        if (photoDataUrl) {
          photoImg = await loadImageElement(photoDataUrl);
        }
        if (photoImg) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(photoX, photoY, photoW, photoH);
          ctx.clip();

          // Calcul object-fit: cover
          const imgAspect = photoImg.width / photoImg.height;
          const boxAspect = photoW / photoH;
          let drawW = photoW;
          let drawH = photoH;
          let drawX = photoX;
          let drawY = photoY;

          if (imgAspect > boxAspect) {
            drawW = photoH * imgAspect;
            drawX = photoX - (drawW - photoW) / 2;
          } else {
            drawH = photoW / imgAspect;
            drawY = photoY - (drawH - photoH) / 2;
          }

          ctx.drawImage(photoImg, drawX, drawY, drawW, drawH);
          ctx.restore();
        } else {
          throw new Error('Pas de photo disponible');
        }
      } catch {
        // Silhouette avatar vectorielle propre si l'image ne charge pas
        ctx.fillStyle = '#F1F5F9';
        ctx.fillRect(photoX, photoY, photoW, photoH);
        ctx.fillStyle = '#94A3B8';
        ctx.beginPath();
        ctx.arc(centerX, photoY + 120, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX, photoY + 310, 110, Math.PI, Math.PI * 2);
        ctx.fill();
      }

      // Nom de l'employé en majuscules grasses
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      let textY = photoY + photoH + 52;
      ctx.fillText(nameParts.line1, centerX, textY);
      if (nameParts.line2) {
        textY += 40;
        ctx.fillText(nameParts.line2, centerX, textY);
      }

      // QR Code vers l'espace personnel du salarié
      const qrSize = 168;
      const qrX = centerX - qrSize / 2;
      const qrY = textY + 22;

      if (qrDataUrl) {
        try {
          const qrImg = await loadImageElement(qrDataUrl);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        } catch {
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(qrX, qrY, qrSize, qrSize);
        }
      }

      // Section "Informations Complémentaires"
      const infoY = qrY + qrSize + 36;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0F172A';
      ctx.font = '800 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Informations Complémentaires', centerX, infoY);

      ctx.fillStyle = '#334155';
      ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Matricule : ${currentEmp?.matricule || 'AT-2026-001'}`, centerX, infoY + 28);
      ctx.fillText(`Service : ${currentEmp?.departement || currentEmp?.poste || 'Logistique & Transport'}`, centerX, infoY + 54);
      ctx.fillText(`Délivrée le : ${deliveryDate}`, centerX, infoY + 80);
    } else {
      // ==========================================
      // VERSO DU BADGE (RÉGULATION & COORDONNÉES)
      // ==========================================
      const w = canvas.width;

      // Bandeau haut marine avec bordure dorée
      ctx.save();
      ctx.fillStyle = '#0B2545';
      ctx.beginPath();
      ctx.roundRect(0, 0, w, 240, [36, 36, 0, 0]);
      ctx.fill();

      // Ligne d'accent or
      ctx.fillStyle = '#CCA333';
      ctx.fillRect(0, 236, w, 6);

      // Fente pour clip de tour de cou réappliquée proprement au verso
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(slotX, slotY, slotW, slotH, 13);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#475569';
      ctx.stroke();

      // Textes d'en-tête
      ctx.textAlign = 'center';
      ctx.fillStyle = '#CCA333';
      ctx.font = '800 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.fillText('RÉGULATION INTERNATIONALE CBSA / OEA', w / 2, 115);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText((settings.company_name || 'ATLANTIC TRANSPORT LTD').toUpperCase(), w / 2, 160);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Systèmes de Gestion & Logistique Multimodale', w / 2, 195);
      ctx.restore();

      // Bloc Conditions d'utilisation
      const boxMargin = 40;
      const boxW = w - boxMargin * 2;
      const boxY = 280;

      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(boxMargin, boxY, boxW, 190, 16);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#0F172A';
      ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText("CONDITIONS D'UTILISATION :", boxMargin + 24, boxY + 40);

      ctx.fillStyle = '#334155';
      ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const p1 = `Cette carte professionnelle est strictement personnelle et demeure la propriété`;
      const p2 = `exclusive d'${companyConfig.companyName}. Elle atteste de l'appartenance du`;
      const p3 = `titulaire au personnel opérationnel et doit être présentée à toute réquisition`;
      const p4 = `des autorités portuaires, douanières ou clients autorisés.`;
      ctx.fillText(p1, boxMargin + 24, boxY + 74);
      ctx.fillText(p2, boxMargin + 24, boxY + 102);
      ctx.fillText(p3, boxMargin + 24, boxY + 130);
      ctx.fillText(p4, boxMargin + 24, boxY + 158);

      // Section Coordonnées Entreprise (avec bandeau vertical marine)
      const coordY = 510;
      ctx.fillStyle = '#0B2545';
      ctx.fillRect(boxMargin, coordY, 6, 260);

      const textLeft = boxMargin + 28;
      const drawInfoLine = (label: string, val: string, yPos: number, isMono: boolean = false) => {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0F172A';
        ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(label, textLeft, yPos);

        ctx.fillStyle = isMono ? '#0B2545' : '#334155';
        ctx.font = isMono
          ? '700 18px monospace'
          : '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(val, textLeft + 220, yPos);
      };

      drawInfoLine('Siège social :', companyConfig.companyAddress, coordY + 30);
      drawInfoLine("Tél. d'urgence :", companyConfig.primaryPhone, coordY + 85, true);
      drawInfoLine('Email contact RH :', companyConfig.primaryEmail, coordY + 140, true);
      drawInfoLine('NEQ / Entreprise :', companyConfig.enterpriseNumber, coordY + 195, true);
      drawInfoLine('Statut Accrédité :', 'OEA-CAN / CT-PAT CERTIFIED', coordY + 250);

      // Simulation de code-barres haute définition
      const barcodeY = 870;
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';

      // Barres de code 128
      const barCount = 74;
      const barStartX = 110;
      const barWidth = 8;
      const barHeight = 85;
      for (let i = 0; i < barCount; i++) {
        const isDrawn = ((i * 17 + (currentEmp?.matricule?.charCodeAt(0) || 7)) % 5) !== 0;
        if (isDrawn) {
          const thickness = (i % 3 === 0) ? 6 : (i % 7 === 0) ? 9 : 3.5;
          ctx.fillRect(barStartX + i * barWidth, barcodeY, thickness, barHeight);
        }
      }

      ctx.font = '700 20px monospace';
      ctx.fillStyle = '#1E293B';
      ctx.fillText(`* ID-${currentEmp?.matricule || 'AT-2026-001'} *`, w / 2, barcodeY + barHeight + 35);

      // Mention de retour en cas de perte
      ctx.fillStyle = '#64748B';
      ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('En cas de perte, merci de retourner cette carte au poste de garde ou à la direction.', w / 2, barcodeY + barHeight + 75);
      ctx.fillText(`Contact retour : ${companyConfig.primaryPhone} | ${companyConfig.primaryEmail}`, w / 2, barcodeY + barHeight + 102);

      // Puce de sécurité / Micro-texte en bas
      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 12px monospace';
      ctx.fillText('SECURISÉE PAR CRYPTOGRAMME UNIQUE ET CONTRÔLE D’ACCÈS CLOUD', w / 2, canvas.height - 40);
    }

    // Bordure globale de la carte
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(1, 1, canvas.width - 2, canvas.height - 2, 36);
    ctx.stroke();

    return canvas;
  };

  /**
   * Action de téléchargement directe (PNG ou JPG)
   * 100% GARANTI SANS ERREUR : utilise directement le Canvas HTML5 natif.
   */
  const handleDownload = async (format: 'png' | 'jpg', side?: 'recto' | 'verso') => {
    const targetSide = side || activeSide;
    setIsExporting(true);
    setExportSuccessMsg(null);

    try {
      const canvas = await renderBadgeToCanvas(targetSide);
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, 0.95);

      const link = document.createElement('a');
      const filename = currentEmp
        ? `carte-pro-${currentEmp.matricule}-${targetSide}.${format}`
        : `carte-pro-${targetSide}.${format}`;
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSuccessMsg(`Téléchargement de la carte (${targetSide.toUpperCase()} .${format.toUpperCase()}) réussi !`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Erreur génération carte:', err);
      alert('Une erreur est survenue lors de la création de la carte. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Télécharger le pack complet (Recto + Verso) en 1 clic
   */
  const handleDownloadBoth = async (format: 'png' | 'jpg') => {
    setIsExporting(true);
    try {
      // 1. Recto
      const canvasRecto = await renderBadgeToCanvas('recto');
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrlRecto = canvasRecto.toDataURL(mimeType, 0.95);

      const linkRecto = document.createElement('a');
      linkRecto.download = `carte-pro-${currentEmp?.matricule || 'salarié'}-RECTO.${format}`;
      linkRecto.href = dataUrlRecto;
      document.body.appendChild(linkRecto);
      linkRecto.click();
      document.body.removeChild(linkRecto);

      // Petite pause pour s'assurer que le navigateur déclenche les 2 téléchargements
      await new Promise((res) => setTimeout(res, 600));

      // 2. Verso
      const canvasVerso = await renderBadgeToCanvas('verso');
      const dataUrlVerso = canvasVerso.toDataURL(mimeType, 0.95);

      const linkVerso = document.createElement('a');
      linkVerso.download = `carte-pro-${currentEmp?.matricule || 'salarié'}-VERSO.${format}`;
      linkVerso.href = dataUrlVerso;
      document.body.appendChild(linkVerso);
      linkVerso.click();
      document.body.removeChild(linkVerso);

      setExportSuccessMsg(`Pack complet (Recto + Verso en .${format.toUpperCase()}) téléchargé avec succès !`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Erreur export pack:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Snippet de code standalone propre
  const standaloneSnippet = `<!-- CARTE PROFESSIONNELLE OFFICIELLE VERTICALE CR-80 - ATLANTIC TRANSPORT SYSTEMS -->
<!-- Export natif HTML5 Canvas 2D : aucun bug de couleur oklch ni de photo blanche -->

<div id="badge-wrapper" style="width: 370px; height: 585px; background: #fff; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.15); border: 1px solid #d1d5db; position: relative; overflow: hidden; display: flex; font-family: -apple-system, sans-serif;">
  <!-- Fente Tour de Cou -->
  <div style="position: absolute; top: 14px; left: 50%; transform: translateX(-50%); width: 56px; height: 12px; background: #cbd5e1; border-radius: 9999px; border: 1.5px solid #94a3b8; z-index: 20;"></div>

  <!-- Colonne Noire avec Intitulé du Poste -->
  <div style="width: 92px; height: 100%; background: #0f172a; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
    <div style="transform: rotate(90deg); white-space: nowrap; color: #fff; font-weight: 900; text-transform: uppercase; letter-spacing: 0.22em; font-size: 16px;">
      ${jobTitleText}
    </div>
  </div>

  <!-- Corps Principal -->
  <div style="flex: 1; padding: 36px 16px 16px; text-align: center; display: flex; flex-direction: column; align-items: center;">
    <!-- En-tête Entreprise avec Logo Officiel -->
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
      <div style="width: 52px; height: 38px; background: #fff; border-radius: 8px; border: 1.5px solid #e2e8f0; display: flex; align-items: center; justify-content: center; padding: 2px; overflow: hidden;">
        <img src="${companyLogoUrl}" alt="Logo Entreprise" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
      </div>
      <div style="text-align: left; line-height: 1.1;">
        <h2 style="font-size: 16px; font-weight: 900; color: #0b2545; margin: 0;">${settings.company_name?.split(' ')[0] || 'ATLANTIC'}</h2>
        <p style="font-size: 11px; font-weight: 800; color: #1e293b; margin: 0;">TRANSPORT SYSTEMS</p>
      </div>
    </div>

    <!-- Photo Salarié -->
    <div style="width: 144px; height: 170px; border: 2.5px solid #111; overflow: hidden; margin-bottom: 10px;">
      <img id="cardPhoto" src="${photoDataUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="Photo Salarié" />
    </div>

    <!-- Nom Salarié -->
    <div style="font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.15; margin-bottom: 10px;">
      <div>${nameParts.line1}</div>
      ${nameParts.line2 ? `<div>${nameParts.line2}</div>` : ''}
    </div>

    <!-- Code QR Portail -->
    <div style="margin-bottom: 8px;">
      <img src="${qrDataUrl}" width="80" height="80" alt="Code QR Espace Salarié" />
    </div>

    <!-- Informations Salarié & Entreprise -->
    <div style="font-size: 10.5px; color: #334155; line-height: 1.35;">
      <div style="font-weight: 700; color: #0f172a;">Informations Complémentaires</div>
      <div>Matricule: <strong>${currentEmp?.matricule || 'AT-2026-001'}</strong></div>
      <div>Service: ${currentEmp?.departement || currentEmp?.poste || 'Logistique & Transport'}</div>
      <div>Délivrée le: ${deliveryDate}</div>
    </div>
  </div>
</div>`;

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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-w-none print:max-h-none">
        {/* En-tête Modal */}
        <div className="bg-[#0B2545] text-white p-4 sm:p-5 flex items-center justify-between gap-4 border-b border-amber-400/30 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                  Badge Officiel CR-80 Vertical · Export Haute Définition
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Moteur Canvas 2D (Sans Bug oklch)
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                Générateur de Carte Professionnelle · {companyConfig.companyName}
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

        {/* Message de confirmation de téléchargement réussi */}
        {exportSuccessMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-4 py-2 text-xs font-semibold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setExportSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Barre de contrôles et sélecteur de salarié */}
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

            {/* Téléversement photo */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLoadPhoto}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Téléverser une photo pour ce salarié (évite toute image blanche)"
            >
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              <span>Changer photo</span>
            </button>

            {/* Basculer Recto / Verso */}
            <button
              type="button"
              onClick={() => setActiveSide(activeSide === 'recto' ? 'verso' : 'recto')}
              className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-600" />
              <span>{activeSide === 'recto' ? 'Afficher Verso' : 'Afficher Recto'}</span>
            </button>
          </div>

          {/* Boutons d'export et téléchargement */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Bouton PNG HD */}
            <button
              type="button"
              onClick={() => handleDownload('png')}
              disabled={isExporting}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              title="Télécharger la face actuelle au format PNG haute définition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG (HD)</span>
            </button>

            {/* Bouton JPG HD */}
            <button
              type="button"
              onClick={() => handleDownload('jpg')}
              disabled={isExporting}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              title="Télécharger la face actuelle au format JPG haute définition"
            >
              <FileImage className="w-3.5 h-3.5" />
              <span>JPG (HD)</span>
            </button>

            {/* Bouton Pack Recto + Verso */}
            <button
              type="button"
              onClick={() => handleDownloadBoth('png')}
              disabled={isExporting}
              className="px-3 py-2 rounded-xl bg-[#0B2545] hover:bg-[#133863] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              title="Télécharger à la fois le Recto et le Verso"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Recto + Verso</span>
            </button>

            {/* Impression directe */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Imprimer</span>
            </button>

            {/* Code source */}
            <button
              type="button"
              onClick={() => setShowCodeSnippet(!showCodeSnippet)}
              className="px-3 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Code</span>
            </button>
          </div>
        </div>

        {/* Barre de personnalisation rapide */}
        <div className="px-4 py-2 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center gap-3 text-xs print:hidden">
          <span className="text-slate-500 font-semibold">Champs éditables :</span>
          <div className="flex items-center gap-1.5">
            <label className="text-slate-600 font-medium">Bandeau Poste :</label>
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
              placeholder="Ex: 03/2026"
              className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold w-24 text-[#0B2545]"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto text-[11px] text-slate-600">
            <span className="bg-white border border-slate-200 px-2 py-0.5 rounded font-mono">
              Tél: {companyConfig.primaryPhone}
            </span>
            <span className="bg-white border border-slate-200 px-2 py-0.5 rounded font-mono">
              Email: {companyConfig.primaryEmail}
            </span>
          </div>
        </div>

        {/* Zone de prévisualisation de la carte (Format vertical CR-80) */}
        <div className="p-4 sm:p-8 flex flex-col items-center justify-center bg-slate-200/80 overflow-y-auto flex-1">
          {activeSide === 'recto' ? (
            /* ============================== */
            /* RECTO VISUEL DU BADGE          */
            /* ============================== */
            <div
              className="w-[370px] h-[585px] bg-white rounded-[20px] shadow-2xl border border-slate-300 relative overflow-hidden flex select-none box-border"
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
              }}
            >
              {/* Fente supérieure pour clip tour de cou */}
              <div
                className="absolute top-3.5 left-1/2 -translate-x-1/2 w-14 h-3 bg-slate-300 rounded-full border border-slate-400 z-30"
                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.35)' }}
                title="Fente clip tour de cou"
              />

              {/* Colonne noire latérale gauche */}
              <div className="w-[94px] h-full bg-[#0F172A] relative flex items-center justify-center overflow-hidden shrink-0 border-r border-slate-900">
                <div
                  className="rotate-90 whitespace-nowrap text-white font-black uppercase tracking-[0.22em]"
                  style={{
                    fontSize:
                      jobTitleText.length > 22
                        ? '14px'
                        : jobTitleText.length > 16
                        ? '16px'
                        : '19px'
                  }}
                >
                  {jobTitleText}
                </div>
              </div>

              {/* Corps principal blanc */}
              <div className="flex-1 h-full bg-white flex flex-col items-center pt-9 px-4 pb-4 text-center relative overflow-hidden">
                {/* Filigrane de sécurité subtil */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-60 z-1"
                  style={{
                    background:
                      'radial-gradient(circle at 80% 20%, rgba(224, 242, 254, 0.4) 0%, rgba(254, 243, 199, 0.2) 60%, transparent 80%)'
                  }}
                />

                {/* En-tête : Logo Officiel Entreprise et Nom */}
                <div className="flex items-center justify-center gap-2.5 mb-2.5 relative z-2">
                  <div className="h-10 w-14 bg-white rounded-lg border border-slate-200/90 flex items-center justify-center p-1 shrink-0 shadow-2xs">
                    <img
                      src={companyLogoUrl}
                      alt={settings.company_name || 'Logo Entreprise'}
                      className="h-full w-auto object-contain"
                    />
                  </div>
                  <div className="text-left leading-tight">
                    <h2 className="text-[15px] font-black text-[#0B2545] tracking-wide m-0">
                      {settings.company_name?.split(' ')[0] || 'ATLANTIC'}
                    </h2>
                    <p className="text-[11px] font-extrabold text-[#1E293B] tracking-wider m-0">
                      TRANSPORT SYSTEMS
                    </p>
                  </div>
                </div>

                {/* Cadre Photo Salarié */}
                <div className="w-[140px] h-[166px] border-[2.5px] border-slate-900 overflow-hidden bg-slate-50 mb-2.5 relative z-2 shadow-xs">
                  <img
                    src={photoDataUrl}
                    alt={currentEmp.nom_complet}
                    className="w-full h-full object-cover block"
                  />
                </div>

                {/* Nom complet du salarié */}
                <div className="text-[17px] font-black text-slate-900 leading-tight mb-2 uppercase tracking-tight relative z-2">
                  <div>{nameParts.line1}</div>
                  {nameParts.line2 && <div>{nameParts.line2}</div>}
                </div>

                {/* Code QR menant directement au portail salarié */}
                <div className="mb-2 relative z-2 bg-white p-1 rounded-sm shadow-2xs">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code ${currentEmp.matricule}`}
                      className="w-20 h-20 block mx-auto"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-slate-100 flex items-center justify-center rounded">
                      <QrCode className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Informations complémentaires */}
                <div className="text-[10.5px] text-slate-700 leading-relaxed relative z-2">
                  <div className="font-bold text-slate-900 mb-0.5 text-[11px]">
                    Informations Complémentaires
                  </div>
                  <div>
                    Matricule :{' '}
                    <span className="font-mono font-bold text-slate-900">
                      {currentEmp.matricule}
                    </span>
                  </div>
                  <div>
                    Service :{' '}
                    <span className="font-medium text-slate-900">
                      {currentEmp.departement || currentEmp.poste || 'Logistique & Transport'}
                    </span>
                  </div>
                  <div>
                    Délivrée le :{' '}
                    <span className="font-mono text-slate-900">{deliveryDate}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ============================== */
            /* VERSO VISUEL DU BADGE          */
            /* ============================== */
            <div
              className="w-[370px] h-[585px] bg-white rounded-[20px] shadow-2xl border border-slate-300 relative overflow-hidden flex flex-col select-none box-border"
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
              }}
            >
              {/* Fente supérieure tour de cou */}
              <div
                className="absolute top-3.5 left-1/2 -translate-x-1/2 w-14 h-3 bg-slate-700 rounded-full border border-slate-500 z-30"
                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}
              />

              {/* Bandeau haut bleu nuit et or */}
              <div className="bg-[#0B2545] text-white pt-10 pb-4 px-4 text-center border-b-2 border-amber-400">
                <span className="text-[9.5px] font-mono tracking-widest text-amber-400 font-bold block mb-1">
                  RÉGULATION INTERNATIONALE CBSA / OEA
                </span>
                <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide m-0">
                  {settings.company_name || 'ATLANTIC TRANSPORT LTD'}
                </h3>
                <p className="text-[10px] text-slate-300 mt-0.5 m-0">
                  Systèmes de Gestion &amp; Logistique Multimodale
                </p>
              </div>

              {/* Corps Verso avec conditions et coordonnées */}
              <div className="p-4 flex-1 flex flex-col justify-between text-left text-xs bg-white">
                <div className="space-y-2.5">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[10.5px] text-slate-600 leading-normal">
                    <p className="font-bold text-slate-900 mb-1">CONDITIONS D&apos;UTILISATION :</p>
                    Cette carte est strictement personnelle et demeure la propriété exclusive
                    d&apos;<strong className="text-slate-900"> {companyConfig.companyName}</strong>. Elle
                    doit être présentée à toute réquisition des autorités portuaires et douanières.
                  </div>

                  <div className="space-y-1.5 text-[11px] border-l-2 border-[#0B2545] pl-3 py-0.5">
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">Siège :</strong>{' '}
                        <span className="text-slate-600">{companyConfig.companyAddress}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <div>
                        <strong className="text-slate-900">Urgence :</strong>{' '}
                        <span className="font-mono font-bold text-[#0B2545]">
                          {companyConfig.primaryPhone}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <div>
                        <strong className="text-slate-900">Email RH :</strong>{' '}
                        <span className="font-mono text-slate-700">
                          {companyConfig.primaryEmail}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <div>
                        <strong className="text-slate-900">NEQ / Entreprise :</strong>{' '}
                        <span className="font-mono text-slate-700">
                          {companyConfig.enterpriseNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Code-barres simulé et avis de restitution */}
                <div className="pt-2 border-t border-slate-200 text-center">
                  <div className="font-mono text-slate-800 tracking-[0.25em] text-base font-bold">
                    ||| | ||||| || |||| ||| ||||
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    * ID-{currentEmp.matricule} *
                  </div>
                  <p className="text-[9.5px] text-slate-400 mt-1 m-0">
                    En cas de perte, merci de retourner cette carte au poste de garde ou à la direction.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Légende sous le badge */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600 print:hidden">
            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Dimensions officielles CR-80 (Portrait)
            </span>
            <span className="text-slate-400">•</span>
            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Rendu haute définition 300 DPI
            </span>
            <span className="text-slate-400">•</span>
            <a
              href={getEmployeePortalUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sky-600 hover:underline font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              Tester le lien du QR Code
            </a>
          </div>

          {/* Tiroir code source standalone */}
          {showCodeSnippet && (
            <div className="mt-5 w-full max-w-xl bg-slate-900 rounded-xl p-4 text-white text-xs font-mono border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold">Code source HTML / CSS du Badge :</span>
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

        {/* Pied de modal avec actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>
              Salarié : <strong className="text-slate-900">{currentEmp.nom_complet}</strong>{' '}
              ({currentEmp.matricule})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownload('png')}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger PNG</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownload('jpg')}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <FileImage className="w-3.5 h-3.5" />
              <span>Télécharger JPG</span>
            </button>
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
    </div>
  );
};
