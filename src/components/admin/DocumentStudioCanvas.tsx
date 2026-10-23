import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Trash2,
  Plus,
  Layers,
  Sparkles,
  Eye,
  Check,
  MousePointer,
  Crosshair,
  Move
} from 'lucide-react';
import {
  DocumentZone,
  ZoneLabelType,
  ZONE_LABELS_CONFIG,
  cropExactPixelZone
} from '../../services/documentStudioService';

interface DocumentStudioCanvasProps {
  imageSrc: string;
  cleanedBackgroundSrc?: string;
  zones: DocumentZone[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string | null) => void;
  onZonesChange: (zones: DocumentZone[]) => void;
  isSelectionModeActive: boolean;
  onToggleSelectionMode: () => void;
  currentLabel: ZoneLabelType;
  viewMode: 'original' | 'cleaned' | 'reconstructed';
}

export const DocumentStudioCanvas: React.FC<DocumentStudioCanvasProps> = ({
  imageSrc,
  cleanedBackgroundSrc,
  zones,
  selectedZoneId,
  onSelectZone,
  onZonesChange,
  isSelectionModeActive,
  onToggleSelectionMode,
  currentLabel,
  viewMode
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Dragging/moving existing zone
  const [isDraggingZone, setIsDraggingZone] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dimensions réelles de l'image source
  const [naturalDim, setNaturalDim] = useState<{ width: number; height: number }>({
    width: 800,
    height: 1130
  });

  // Chargement de l'image de base
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      baseImageRef.current = img;
      setNaturalDim({
        width: img.naturalWidth || 800,
        height: img.naturalHeight || 1130
      });
      // Ajuster le zoom pour tenir dans l'écran
      if (containerRef.current) {
        const cWidth = containerRef.current.clientWidth - 40;
        const initialZoom = Math.min(1, Math.max(0.4, cWidth / (img.naturalWidth || 800)));
        setZoom(initialZoom);
      }
    };
    img.src =
      viewMode === 'cleaned' && cleanedBackgroundSrc
        ? cleanedBackgroundSrc
        : imageSrc;
  }, [imageSrc, cleanedBackgroundSrc, viewMode]);

  // Convertit les coordonnées écran (event) en coordonnées réelles sur l'image naturelle
  const getNaturalCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = naturalDim.width / rect.width;
      const scaleY = naturalDim.height / rect.height;

      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      return {
        x: Math.round(clientX * scaleX),
        y: Math.round(clientY * scaleY)
      };
    },
    [naturalDim]
  );

  // Dessin principal du canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImageRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Définir la résolution réelle du canvas
    canvas.width = naturalDim.width;
    canvas.height = naturalDim.height;

    // 1. Dessiner le fond (original ou nettoyé)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImageRef.current, 0, 0, canvas.width, canvas.height);

    // 2. Si mode "reconstructed", dessiner les zones actives
    if (viewMode === 'reconstructed') {
      zones.forEach((zone) => {
        if (zone.action === 'hide') return;
        const src = zone.replacementDataUrl || zone.croppedImageDataUrl;
        if (!src) return;
        const img = new Image();
        img.src = src;
        if (img.complete) {
          ctx.drawImage(img, zone.x, zone.y, zone.width, zone.height);
        }
      });
    }

    // 3. Dessiner les contours des zones labellisées
    zones.forEach((zone) => {
      const isSelected = zone.id === selectedZoneId;
      const labelConfig = ZONE_LABELS_CONFIG[zone.label] || ZONE_LABELS_CONFIG.autre;

      // Cadre du rectangle
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = isSelected ? '#D4A017' : labelConfig.borderColor;
      ctx.fillStyle = isSelected ? 'rgba(212, 160, 23, 0.15)' : 'rgba(11, 37, 69, 0.08)';

      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);

      // Badge de libellé en haut du rectangle
      const badgeText = `${labelConfig.icon} ${zone.name}`;
      ctx.font = 'bold 12px sans-serif';
      const textMetrics = ctx.measureText(badgeText);
      const badgeW = textMetrics.width + 12;
      const badgeH = 22;
      const badgeY = Math.max(0, zone.y - badgeH);

      ctx.fillStyle = isSelected ? '#0B2545' : labelConfig.borderColor;
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(zone.x, badgeY, badgeW, badgeH, 4)
        : ctx.rect(zone.x, badgeY, badgeW, badgeH);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(badgeText, zone.x + 6, badgeY + 15);

      // Si sélectionné, poignées aux coins
      if (isSelected) {
        const handleSize = 8;
        ctx.fillStyle = '#D4A017';
        // 4 coins
        ctx.fillRect(zone.x - handleSize / 2, zone.y - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(
          zone.x + zone.width - handleSize / 2,
          zone.y - handleSize / 2,
          handleSize,
          handleSize
        );
        ctx.fillRect(
          zone.x - handleSize / 2,
          zone.y + zone.height - handleSize / 2,
          handleSize,
          handleSize
        );
        ctx.fillRect(
          zone.x + zone.width - handleSize / 2,
          zone.y + zone.height - handleSize / 2,
          handleSize,
          handleSize
        );
      }
    });

    // 4. Rectangle en cours de dessin manuel
    if (currentRect && isDrawing) {
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#D4A017';
      ctx.fillStyle = 'rgba(212, 160, 23, 0.2)';
      ctx.strokeRect(
        currentRect.x,
        currentRect.y,
        currentRect.width,
        currentRect.height
      );
      ctx.fillRect(
        currentRect.x,
        currentRect.y,
        currentRect.width,
        currentRect.height
      );
      ctx.setLineDash([]); // reset dash
    }
  }, [naturalDim, zones, selectedZoneId, currentRect, isDrawing, viewMode]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Événements souris pour la sélection interactive
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getNaturalCoords(e);

    // 1. Si on est en mode sélection manuelle (dessin de nouveau rectangle)
    if (isSelectionModeActive) {
      setIsDrawing(true);
      setStartPoint(coords);
      setCurrentRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
      return;
    }

    // 2. Sinon, tester si on a cliqué sur une zone existante pour la sélectionner / déplacer
    const clickedZone = [...zones]
      .reverse()
      .find(
        (z) =>
          coords.x >= z.x &&
          coords.x <= z.x + z.width &&
          coords.y >= z.y &&
          coords.y <= z.y + z.height
      );

    if (clickedZone) {
      onSelectZone(clickedZone.id);
      setIsDraggingZone(true);
      setDragOffset({
        x: coords.x - clickedZone.x,
        y: coords.y - clickedZone.y
      });
    } else {
      onSelectZone(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getNaturalCoords(e);

    // Dessin d'un nouveau rectangle
    if (isDrawing && startPoint) {
      const minX = Math.min(startPoint.x, coords.x);
      const minY = Math.min(startPoint.y, coords.y);
      const width = Math.abs(coords.x - startPoint.x);
      const height = Math.abs(coords.y - startPoint.y);

      setCurrentRect({
        x: Math.max(0, minX),
        y: Math.max(0, minY),
        width: Math.min(naturalDim.width - minX, width),
        height: Math.min(naturalDim.height - minY, height)
      });
    }

    // Déplacement d'une zone existante
    if (isDraggingZone && selectedZoneId) {
      const updated = zones.map((z) => {
        if (z.id !== selectedZoneId) return z;
        const newX = Math.max(0, Math.min(naturalDim.width - z.width, coords.x - dragOffset.x));
        const newY = Math.max(0, Math.min(naturalDim.height - z.height, coords.y - dragOffset.y));
        return {
          ...z,
          x: Math.round(newX),
          y: Math.round(newY)
        };
      });
      onZonesChange(updated);
    }
  };

  const handleMouseUp = () => {
    // Si on terminait un dessin de zone
    if (isDrawing && currentRect && startPoint && baseImageRef.current) {
      // Ignorer les micro-clics (< 15px)
      if (currentRect.width >= 15 && currentRect.height >= 15) {
        // RÈGLE SANS IA : Découpage au pixel près de la zone exacte depuis le Canvas
        const cropped = cropExactPixelZone(
          baseImageRef.current,
          currentRect.x,
          currentRect.y,
          currentRect.width,
          currentRect.height
        );

        const newZone: DocumentZone = {
          id: `zone_${Date.now()}`,
          name: `${ZONE_LABELS_CONFIG[currentLabel]?.label || 'Zone'} ${zones.length + 1}`,
          x: currentRect.x,
          y: currentRect.y,
          width: currentRect.width,
          height: currentRect.height,
          label: currentLabel,
          action: 'keep', // Par défaut : Conserver sans IA
          croppedImageDataUrl: cropped,
          kitsCmsImageUrl: ''
        };

        const updated = [...zones, newZone];
        onZonesChange(updated);
        onSelectZone(newZone.id);
      }
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
    setIsDraggingZone(false);
  };

  const handleDeleteSelectedZone = () => {
    if (!selectedZoneId) return;
    const filtered = zones.filter((z) => z.id !== selectedZoneId);
    onZonesChange(filtered);
    onSelectZone(null);
  };

  return (
    <div className="flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
      {/* Barre d'outils du Canvas */}
      <div className="bg-slate-950 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 text-xs text-white">
        {/* Mode de sélection */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSelectionMode}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              isSelectionModeActive
                ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isSelectionModeActive ? (
              <>
                <Crosshair className="w-4 h-4 text-slate-950 animate-pulse" />
                <span>Mode Dessin Actif (Glisser pour tracer)</span>
              </>
            ) : (
              <>
                <MousePointer className="w-4 h-4 text-amber-400" />
                <span>Activer Dessin Rectangle</span>
              </>
            )}
          </button>

          {selectedZoneId && (
            <button
              type="button"
              onClick={handleDeleteSelectedZone}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Supprimer la zone sélectionnée"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer zone</span>
            </button>
          )}
        </div>

        {/* Contrôles Zoom & Dimension */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(0.3, prev - 0.1))}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom arrière"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-[11px] px-2 text-amber-400 font-bold min-w-[48px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(2.5, prev + 0.1))}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom avant"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Taille 100%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Info zones actives */}
        <div className="text-[11px] text-slate-400 flex items-center gap-2">
          <span className="bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300 font-mono">
            {zones.length} zone(s) découpée(s)
          </span>
          <span className="hidden sm:inline font-mono">
            {naturalDim.width} × {naturalDim.height} px
          </span>
        </div>
      </div>

      {/* Surface de travail Canvas interactif avec défilement */}
      <div
        ref={containerRef}
        className="overflow-auto max-h-[580px] p-6 flex items-center justify-center bg-radial from-slate-800 to-slate-950"
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.1s ease-out'
          }}
          className="relative inline-block shadow-2xl rounded-lg overflow-hidden border-2 border-slate-700 bg-white"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              cursor: isSelectionModeActive ? 'crosshair' : isDraggingZone ? 'grabbing' : 'default',
              display: 'block',
              maxWidth: 'none'
            }}
          />
        </div>
      </div>

      {/* Pied de Canvas : Guide rapide */}
      <div className="bg-slate-950/80 px-4 py-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>Sélection manuelle obligatoire (Étape 1)</span>
          </span>
          <span className="text-slate-600">·</span>
          <span>Découpage pixel-perfect certifié sans IA (Étape 3)</span>
        </div>
        <div className="text-slate-500 font-mono text-[10px]">
          Clic pour sélectionner une zone · Glisser pour la déplacer
        </div>
      </div>
    </div>
  );
};
