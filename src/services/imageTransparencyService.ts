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
