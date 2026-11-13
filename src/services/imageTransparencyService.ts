/**
 * Service de suppression d'arrière-plan et transparence pour fichiers importés
 * 100% gratuit, exécuté localement dans le navigateur via l'API HTML5 Canvas.
 */

export interface TransparencyOptions {
  tolerance?: number; // 0 à 100 (défaut: 30)
  targetColor?: { r: number; g: number; b: number }; // Par défaut blanc {255, 255, 255}
  smoothEdges?: boolean;
}

/**
 * Supprime le fond blanc ou clair d'une image et renvoie un Data URL PNG transparent.
 */
export async function removeImageBackground(
  imageSrc: string,
  options: TransparencyOptions = {}
): Promise<string> {
  const tolerance = options.tolerance ?? 32;
  const target = options.targetColor ?? { r: 255, g: 255, b: 255 };

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Seuil de distance euclidienne dans l'espace RVB
        const maxDist = (tolerance / 100) * 441.67; // sqrt(255^2 * 3) = ~441.67

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a === 0) continue;

          // Distance par rapport à la couleur cible
          const dist = Math.sqrt(
            Math.pow(r - target.r, 2) +
            Math.pow(g - target.g, 2) +
            Math.pow(b - target.b, 2)
          );

          if (dist <= maxDist) {
            // Entièrement transparent
            data[i + 3] = 0;
          } else if (dist <= maxDist * 1.3) {
            // Dégradé doux sur les contours pour éviter les artefacts d'escalier
            const factor = (dist - maxDist) / (maxDist * 0.3);
            data[i + 3] = Math.round(a * Math.max(0, Math.min(1, factor)));
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const transparentDataUrl = canvas.toDataURL('image/png');
        resolve(transparentDataUrl);
      } catch (err) {
        console.warn('Erreur traitement transparence canvas:', err);
        resolve(imageSrc);
      }
    };

    img.onerror = () => {
      resolve(imageSrc);
    };

    img.src = imageSrc;
  });
}

export interface OptimizeImageOptions {
  maxDimension?: number;
  quality?: number;
  forceJpeg?: boolean;
}

/**
 * Lit un fichier image local (PNG/JPG/WebP/SVG), redimensionne proprement si trop grand
 * pour éviter les dépassements de quota localStorage / Firestore, tout en préservant
 * la transparence PNG pour logos, signatures et cachets.
 */
export async function readAndOptimizeImageFile(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<string> {
  const maxDim = options.maxDimension ?? 850;
  const quality = options.quality ?? 0.88;

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Format de fichier non lisible'));
      }
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier sélectionné'));
    reader.readAsDataURL(file);
  });

  // Si SVG ou petit fichier (< 120 Ko), conserver directement sans perte
  if (file.type === 'image/svg+xml' || rawDataUrl.length < 160000) {
    return rawDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width || 600;
        const h = img.naturalHeight || img.height || 600;
        const ratio = Math.min(1, maxDim / Math.max(w, h));
        const targetW = Math.max(1, Math.round(w * ratio));
        const targetH = Math.max(1, Math.round(h * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const isJpeg = options.forceJpeg || file.type === 'image/jpeg';
        const optimized = isJpeg
          ? canvas.toDataURL('image/jpeg', quality)
          : canvas.toDataURL('image/png');

        resolve(optimized.length < rawDataUrl.length ? optimized : rawDataUrl);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

