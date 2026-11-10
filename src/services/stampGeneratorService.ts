/**
 * Service de génération de tampons et cachets officiels professionnels
 * 100% gratuit, exécuté localement dans le navigateur sur HTML5 Canvas.
 * Permet de créer des sceaux ronds, rectangulaires et ovales avec encre réaliste.
 */

export type StampShape = 'circle' | 'rectangle' | 'oval';
export type StampInkColor = '#004D99' | '#B91C1C' | '#15803D' | '#1E293B' | '#6D28D9';

export interface StampOptions {
  shape: StampShape;
  inkColor: string;
  companyName: string; // Texte supérieur courbé ou en-tête
  subtitle?: string; // Texte inférieur courbé ou pied
  centerMention: string; // Ex: "DIRECTION GÉNÉRALE", "VISA RH", "CERTIFIÉ CONFORME"
  dateText?: string; // Ex: "10 NOV. 2026"
  referenceCode?: string; // Ex: "REF: ATL-2026-OK"
  emblemType?: 'stars' | 'leaf' | 'shield' | 'customImage';
  customImageSrc?: string; // Data URL d'une image/logo à intégrer au centre
  weatheredEffect?: boolean; // Effet d'encre tamponnée avec micro-aspérités
  rotation?: number; // Légère inclinaison réaliste (-15 à +15 deg)
  opacity?: number; // 0 à 100
  width?: number; // Largeur en px (défaut 400)
  height?: number; // Hauteur en px (défaut 400)
}

/**
 * Modèles préconfigurés de tampons d'attestation pour les tickets d'entretien
 */
export const CANDIDATE_TICKET_STAMP_PRESETS = [
  {
    id: 'dossier_recevable',
    label: 'Dossier Recevable & Conforme (Bleu Officiel)',
    centerMention: 'DOSSIER RECEVABLE & QUALIFIÉ',
    subtitle: 'CONVOCATION OFFICIELLE SURREY BC',
    inkColor: '#004D99',
    shape: 'circle' as StampShape,
    emblemType: 'shield' as const
  },
  {
    id: 'visa_rh_canada',
    label: 'Visa Recrutement Éthique Canada (Vert Validation)',
    centerMention: 'VISA RH RECRUTEMENT ÉTHIQUE',
    subtitle: 'CONFORME LIPR & LOI CANADA',
    inkColor: '#15803D',
    shape: 'rectangle' as StampShape,
    emblemType: 'leaf' as const
  },
  {
    id: 'candidat_retenu',
    label: 'Statut Candidat Retenu (Rouge Notarié)',
    centerMention: 'CANDIDAT RETENU POUR ENTRETIEN',
    subtitle: 'STATUT DÉFINITIF APRÈS VALIDATION',
    inkColor: '#B91C1C',
    shape: 'circle' as StampShape,
    emblemType: 'stars' as const
  },
  {
    id: 'admission_conditionnelle',
    label: 'Certification EIMT / Accréditation (Violet Souverain)',
    centerMention: 'ACCRÉDITÉ MOBILITÉ INTERNATIONALE',
    subtitle: 'DIRECTION DES RESSOURCES HUMAINES',
    inkColor: '#6D28D9',
    shape: 'oval' as StampShape,
    emblemType: 'stars' as const
  }
];

/**
 * Dessine un texte le long d'un arc de cercle sur Canvas 2D
 */
function drawTextAlongArc(
  ctx: CanvasRenderingContext2D,
  str: string,
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  isDownward = false
) {
  const chars = str.split('');
  const totalAngle = Math.PI * 0.9;
  const step = totalAngle / Math.max(1, chars.length);
  const initialAngle = startAngle - (totalAngle / 2);

  ctx.save();
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const angle = initialAngle + (i + 0.5) * step;

    ctx.save();
    ctx.translate(
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius
    );
    ctx.rotate(angle + (isDownward ? -Math.PI / 2 : Math.PI / 2));
    ctx.fillText(char, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Génère un tampon professionnel haute résolution sous forme de PNG transparent
 */
export async function generateOfficialStampPngDataUrl(opts: StampOptions): Promise<string> {
  const size = opts.width || 420;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = opts.shape === 'rectangle' ? Math.round(size * 0.55) : size;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const ink = opts.inkColor || '#004D99';

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  // Rotation globale optionnelle pour réalisme
  if (opts.rotation) {
    ctx.translate(cx, cy);
    ctx.rotate((opts.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;

  if (opts.shape === 'circle') {
    const rOuter = (size / 2) - 16;
    const rInner = rOuter - 14;

    // Double cercle extérieur
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
    ctx.stroke();

    // Cercle central pointillé ou continu
    const rCenter = rInner - 32;
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, rCenter, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Texte supérieur courbé
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawTextAlongArc(ctx, opts.companyName.toUpperCase(), cx, cy, rOuter - 8, -Math.PI / 2, false);

    // Texte inférieur courbé
    const sub = opts.subtitle || 'SURREY, BC · CANADA';
    ctx.font = 'bold 13px Arial, sans-serif';
    drawTextAlongArc(ctx, sub.toUpperCase(), cx, cy, rOuter - 8, Math.PI / 2, true);

    // Étoiles de séparation gauche et droite
    ctx.font = 'bold 16px Arial';
    ctx.fillText('★', cx - (rOuter - 8), cy);
    ctx.fillText('★', cx + (rOuter - 8), cy);

    // Centre du tampon
    let centerCurrentY = cy - 24;

    if (opts.emblemType === 'shield') {
      ctx.font = 'bold 18px Arial';
      ctx.fillText('🛡️', cx, centerCurrentY);
      centerCurrentY += 16;
    } else if (opts.emblemType === 'leaf') {
      ctx.font = 'bold 18px Arial';
      ctx.fillText('🍁', cx, centerCurrentY);
      centerCurrentY += 16;
    } else {
      ctx.font = 'bold 14px Arial';
      ctx.fillText('★ ★ ★', cx, centerCurrentY);
      centerCurrentY += 14;
    }

    // Mention centrale principale
    ctx.font = 'bold 15px Arial Black, sans-serif';
    ctx.fillText(opts.centerMention.toUpperCase(), cx, centerCurrentY + 4);

    // Dateur ou référence
    if (opts.dateText) {
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText(`DATE : ${opts.dateText}`, cx, centerCurrentY + 22);
    }
    if (opts.referenceCode) {
      ctx.font = '10px Arial, sans-serif';
      ctx.fillText(opts.referenceCode, cx, centerCurrentY + 36);
    }

  } else if (opts.shape === 'rectangle') {
    const pad = 12;
    const w = canvas.width - (pad * 2);
    const h = canvas.height - (pad * 2);

    // Double rectangle avec coins arrondis
    ctx.lineWidth = 4.5;
    ctx.strokeRect(pad, pad, w, h);

    ctx.lineWidth = 1.5;
    ctx.strokeRect(pad + 6, pad + 6, w - 12, h - 12);

    // Lignes horizontales de séparation
    ctx.beginPath();
    ctx.moveTo(pad + 12, pad + 40);
    ctx.lineTo(pad + w - 12, pad + 40);
    ctx.moveTo(pad + 12, pad + h - 34);
    ctx.lineTo(pad + w - 12, pad + h - 34);
    ctx.stroke();

    // En-tête
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.companyName.toUpperCase(), cx, pad + 24);

    // Mention centrale
    ctx.font = 'bold 17px Arial Black, sans-serif';
    ctx.fillText(opts.centerMention.toUpperCase(), cx, cy - 6);

    if (opts.dateText) {
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.fillText(`DATE D'ÉMISSION : ${opts.dateText}`, cx, cy + 18);
    }

    // Pied
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillText((opts.subtitle || 'DIRECTION DU RECRUTEMENT INTERNATIONAL · CANADA').toUpperCase(), cx, pad + h - 18);

  } else {
    // Forme Ovale
    const rx = (canvas.width / 2) - 18;
    const ry = (canvas.height / 2) - 26;

    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx - 9, ry - 9, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.companyName.toUpperCase(), cx, cy - (ry * 0.5));

    ctx.font = 'bold 16px Arial Black, sans-serif';
    ctx.fillText(opts.centerMention.toUpperCase(), cx, cy);

    if (opts.dateText) {
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText(`LE : ${opts.dateText}`, cx, cy + 22);
    }

    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillText((opts.subtitle || 'CANADA IMMIGRATION & RECRUITMENT').toUpperCase(), cx, cy + (ry * 0.6));
  }

  // Effet d'encre tamponnée (weathered texture avec micro-grains)
  if (opts.weatheredEffect !== false) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        // Micro-bruit aléatoire d'usure d'encre
        const noise = Math.random();
        if (noise < 0.12) {
          // Point blanchi / usé
          data[i + 3] = Math.round(data[i + 3] * 0.15);
        } else if (noise < 0.28) {
          data[i + 3] = Math.round(data[i + 3] * 0.75);
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  ctx.restore();
  return canvas.toDataURL('image/png');
}

export type OfficialStampConfig = StampOptions;
export const generateStampPngDataUrl = generateOfficialStampPngDataUrl;
