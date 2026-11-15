import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, RotateCcw, ArrowUp, ArrowDown, X } from 'lucide-react';
import { AssetWrapMode, PdfAssetItemSettings } from '../../services/departmentsAndEmailService';

export interface EditableDocumentVisualProps {
  src: string;
  alt: string;
  label?: string;
  settings?: PdfAssetItemSettings;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateSettings: (patch: Partial<PdfAssetItemSettings>) => void;
  onReset?: () => void;
  defaultWidthPx?: number;
  defaultHeightPx?: number;
  className?: string;
  interactive?: boolean;
}

const WRAP_OPTIONS: {
  mode: AssetWrapMode;
  label: string;
  description: string;
}[] = [
  { mode: 'square', label: 'Carré', description: 'Habillage rectangulaire autour du visuel' },
  { mode: 'tight', label: 'Rapproché', description: 'Texte rapproché des contours' },
  { mode: 'through', label: 'Au travers', description: 'Texte au plus près / traversant' },
  { mode: 'top_bottom', label: 'Haut et bas', description: 'Texte uniquement au-dessus et en dessous' },
  { mode: 'behind_text', label: 'Derrière le texte', description: 'Placé en arrière-plan sous le texte' },
  { mode: 'in_front', label: 'Devant le texte', description: 'Flottant librement par-dessus le texte' }
];

const WordWrapIcon: React.FC<{ mode: AssetWrapMode; active?: boolean }> = ({ mode, active }) => {
  const lineColor = active ? '#1d4ed8' : '#475569';
  const archColor = '#2563eb';
  return (
    <svg viewBox="0 0 28 24" className="w-6 h-5 mx-auto">
      {/* Lignes de texte horizontales */}
      <line x1="2" y1="4" x2="26" y2="4" stroke={lineColor} strokeWidth="1.5" />
      <line
        x1="2"
        y1="8.5"
        x2={mode === 'inline' || mode === 'top_bottom' ? '8' : mode === 'behind_text' || mode === 'in_front' ? '26' : '8'}
        y2="8.5"
        stroke={lineColor}
        strokeWidth="1.5"
        opacity={mode === 'inline' ? 0.25 : 1}
      />
      {(mode === 'square' || mode === 'tight' || mode === 'through') && (
        <>
          <line x1="20" y1="8.5" x2="26" y2="8.5" stroke={lineColor} strokeWidth="1.5" />
          <line x1="2" y1="13" x2="7.5" y2="13" stroke={lineColor} strokeWidth="1.5" />
          <line x1="20.5" y1="13" x2="26" y2="13" stroke={lineColor} strokeWidth="1.5" />
        </>
      )}
      {(mode === 'behind_text' || mode === 'in_front') && (
        <line x1="2" y1="13" x2="26" y2="13" stroke={lineColor} strokeWidth="1.5" />
      )}
      <line x1="2" y1="17.5" x2="26" y2="17.5" stroke={lineColor} strokeWidth="1.5" />
      <line x1="2" y1="21.5" x2="26" y2="21.5" stroke={lineColor} strokeWidth="1.5" />

      {/* Pont / Arche bleue Word 2013 */}
      <path
        d="M9.5 16.5 L9.5 11.5 A4.5 4.5 0 0 1 18.5 11.5 L18.5 16.5 Z"
        fill={mode === 'in_front' ? '#93c5fd' : mode === 'behind_text' ? 'rgba(147,197,253,0.45)' : '#bfdbfe'}
        stroke={archColor}
        strokeWidth="1.5"
        opacity={mode === 'behind_text' ? 0.6 : 1}
      />
    </svg>
  );
};

export const EditableDocumentVisual: React.FC<EditableDocumentVisualProps> = ({
  src,
  alt,
  label,
  settings,
  isSelected,
  onSelect,
  onUpdateSettings,
  onReset,
  defaultWidthPx = 140,
  defaultHeightPx = 64,
  className = '',
  interactive = true
}) => {
  const [showLayoutPopover, setShowLayoutPopover] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const widthPx =
    settings?.widthUnit === 'px' && settings.widthValue
      ? settings.widthValue
      : defaultWidthPx;
  const heightPx =
    settings?.heightUnit === 'px' && settings.heightValue
      ? settings.heightValue
      : defaultHeightPx;

  const widthCss =
    settings?.widthValue !== undefined
      ? `${settings.widthValue}${settings.widthUnit || 'px'}`
      : `${defaultWidthPx}px`;
  const heightCss =
    settings?.heightValue !== undefined
      ? `${settings.heightValue}${settings.heightUnit || 'px'}`
      : `${defaultHeightPx}px`;

  const wrapMode: AssetWrapMode = settings?.wrapMode || 'inline';
  const ox = settings?.offsetX ?? 0;
  const oy = settings?.offsetY ?? 0;
  const rot = settings?.rotation ?? 0;
  const opacity = ((settings?.opacity ?? 100) as number) / 100;

  useEffect(() => {
    if (!isSelected) {
      setShowLayoutPopover(false);
    }
  }, [isSelected]);

  const startBodyDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    e.stopPropagation();
    onSelect();

    const startX = e.clientX;
    const startY = e.clientY;
    const initOx = settings?.offsetX ?? 0;
    const initOy = settings?.offsetY ?? 0;

    const handleMove = (mv: MouseEvent) => {
      const dx = Math.round(mv.clientX - startX);
      const dy = Math.round(mv.clientY - startY);
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        onUpdateSettings({
          offsetX: Math.max(-420, Math.min(420, initOx + dx)),
          offsetY: Math.max(-420, Math.min(420, initOy + dy))
        });
      }
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

  const startResizeDrag = (dir: HandleDir, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const rect = boxRef.current?.getBoundingClientRect();
    const initW = rect ? Math.round(rect.width) : widthPx;
    const initH = rect ? Math.round(rect.height) : heightPx;

    const handleMove = (mv: MouseEvent) => {
      const dx = mv.clientX - startX;
      const dy = mv.clientY - startY;

      let nextW = initW;
      let nextH = initH;

      if (dir.includes('e')) nextW = initW + dx;
      if (dir.includes('w')) nextW = initW - dx;
      if (dir.includes('s')) nextH = initH + dy;
      if (dir.includes('n')) nextH = initH - dy;

      const patch: Partial<PdfAssetItemSettings> = {};
      if (dir.includes('e') || dir.includes('w')) {
        patch.widthUnit = 'px';
        patch.widthValue = Math.max(24, Math.min(680, Math.round(nextW)));
      }
      if (dir.includes('n') || dir.includes('s')) {
        patch.heightUnit = 'px';
        patch.heightValue = Math.max(20, Math.min(620, Math.round(nextH)));
      }
      onUpdateSettings(patch);
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const startRotateDrag = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const handleMove = (mv: MouseEvent) => {
      const rad = Math.atan2(mv.clientY - cy, mv.clientX - cx);
      let deg = Math.round((rad * 180) / Math.PI + 90);
      while (deg > 180) deg -= 360;
      while (deg < -180) deg += 360;
      onUpdateSettings({ rotation: deg });
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const computedZIndex =
    wrapMode === 'behind_text'
      ? Math.min(0, settings?.zIndex ?? -1)
      : wrapMode === 'in_front'
      ? Math.max(25, settings?.zIndex ?? 25)
      : settings?.zIndex ?? 10;

  const wrapperClass =
    wrapMode === 'top_bottom'
      ? 'block mx-auto my-2 w-fit'
      : 'inline-block align-middle';

  const floatSide: React.CSSProperties['float'] =
    wrapMode === 'square' || wrapMode === 'tight' || wrapMode === 'through'
      ? ox < -35
        ? 'left'
        : ox > 35
        ? 'right'
        : undefined
      : undefined;

  const handles: { dir: HandleDir; posClass: string; cursor: string }[] = [
    { dir: 'nw', posClass: '-top-1.5 -left-1.5', cursor: 'nwse-resize' },
    { dir: 'n', posClass: '-top-1.5 left-1/2 -translate-x-1/2', cursor: 'ns-resize' },
    { dir: 'ne', posClass: '-top-1.5 -right-1.5', cursor: 'nesw-resize' },
    { dir: 'e', posClass: 'top-1/2 -translate-y-1/2 -right-1.5', cursor: 'ew-resize' },
    { dir: 'se', posClass: '-bottom-1.5 -right-1.5', cursor: 'nwse-resize' },
    { dir: 's', posClass: '-bottom-1.5 left-1/2 -translate-x-1/2', cursor: 'ns-resize' },
    { dir: 'sw', posClass: '-bottom-1.5 -left-1.5', cursor: 'nesw-resize' },
    { dir: 'w', posClass: 'top-1/2 -translate-y-1/2 -left-1.5', cursor: 'ew-resize' }
  ];

  const activeWrapMeta =
    wrapMode === 'inline'
      ? { label: 'Aligné sur le texte', description: 'Suit le flux naturel du paragraphe' }
      : WRAP_OPTIONS.find((w) => w.mode === wrapMode) || WRAP_OPTIONS[0];

  return (
    <div
      ref={boxRef}
      onClick={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={startBodyDrag}
      title={interactive ? 'Cliquez pour sélectionner, glissez pour déplacer, tirez les poignées pour redimensionner' : undefined}
      className={`${wrapperClass} relative select-none transition-shadow ${
        interactive ? 'cursor-move' : ''
      } ${
        isSelected && interactive
          ? 'ring-2 ring-[#2563eb] ring-offset-1 bg-blue-50/10'
          : interactive
          ? 'hover:ring-1 hover:ring-blue-300/80'
          : ''
      } ${className}`}
      style={{
        float: floatSide,
        marginRight: floatSide === 'left' ? '12px' : undefined,
        marginLeft: floatSide === 'right' ? '12px' : undefined,
        zIndex: isSelected ? 40 : computedZIndex,
        transform:
          ox !== 0 || oy !== 0 || rot !== 0
            ? `translate(${ox}px, ${oy}px) rotate(${rot}deg)`
            : undefined
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="object-contain block pointer-events-none"
        style={{
          maxWidth: widthCss,
          maxHeight: heightCss,
          opacity,
          filter:
            settings?.tintEnabled && settings?.tintColor
              ? 'grayscale(100%) contrast(1.1)'
              : undefined
        }}
      />

      {/* POIGNÉES DE SÉLECTION WORD 2013 (Masquées dans la capture html2canvas) */}
      {isSelected && interactive && (
        <div data-html2canvas-ignore="true" className="contents">
          {/* Poignée de rotation en haut */}
          <button
            type="button"
            onMouseDown={startRotateDrag}
            title="Faire pivoter (glisser)"
            className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border border-[#2563eb] text-[#2563eb] shadow-xs flex items-center justify-center hover:bg-blue-50 cursor-grab active:cursor-grabbing z-50"
          >
            <RotateCw className="w-3 h-3" />
          </button>
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-px h-2 bg-[#2563eb] pointer-events-none" />

          {/* 8 poignées de redimensionnement */}
          {handles.map((h) => (
            <button
              key={h.dir}
              type="button"
              onMouseDown={(e) => startResizeDrag(h.dir, e)}
              title="Redimensionner"
              style={{ cursor: h.cursor }}
              className={`absolute ${h.posClass} w-2.5 h-2.5 bg-white border border-[#2563eb] shadow-xs z-50 hover:bg-[#2563eb]`}
            />
          ))}

          {/* Étiquette de dimensions en bas */}
          <div className="absolute -bottom-6 left-0 px-1.5 py-0.5 rounded bg-[#0B2545] text-white text-[9px] font-mono whitespace-nowrap shadow-xs pointer-events-none z-50">
            {label || alt} · {Math.round(widthPx)}×{Math.round(heightPx)} · {rot}°
          </div>

          {/* Bouton flottant "Options de disposition" style Word 2013 */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowLayoutPopover((prev) => !prev);
            }}
            title="Options de disposition (Word 2013)"
            className="absolute top-0 -right-9 w-7 h-7 rounded bg-white border border-[#2563eb] shadow-md flex items-center justify-center hover:bg-blue-50 cursor-pointer z-50"
          >
            <WordWrapIcon mode={wrapMode} active />
          </button>

          {/* Popover Word 2013 : OPTIONS DE DISPOSITION */}
          {showLayoutPopover && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{ transform: rot !== 0 ? `rotate(${-rot}deg)` : undefined }}
              className="absolute top-0 left-[calc(100%+40px)] w-64 bg-white border border-slate-300 rounded-md shadow-2xl p-3 text-slate-800 z-[70] text-left font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2.5">
                <span className="text-[11px] font-extrabold tracking-wider text-slate-700 uppercase">
                  OPTIONS DE DISPOSITION
                </span>
                <button
                  type="button"
                  onClick={() => setShowLayoutPopover(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Section 1 : Aligné sur le texte */}
              <div className="mb-2.5">
                <div className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-1 mb-1.5 rounded-xs">
                  Aligné sur le texte
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ wrapMode: 'inline', zIndex: 10 })}
                  className={`w-12 h-10 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                    wrapMode === 'inline'
                      ? 'border-[#2563eb] bg-blue-50 ring-1 ring-[#2563eb]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Aligné sur le texte"
                >
                  <WordWrapIcon mode="inline" active={wrapMode === 'inline'} />
                </button>
              </div>

              {/* Section 2 : Avec habillage du texte */}
              <div className="mb-2.5">
                <div className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-1 mb-1.5 rounded-xs">
                  Avec habillage du texte
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {WRAP_OPTIONS.map((opt) => {
                    const active = wrapMode === opt.mode;
                    return (
                      <button
                        key={opt.mode}
                        type="button"
                        onClick={() => {
                          const patch: Partial<PdfAssetItemSettings> = { wrapMode: opt.mode };
                          if (opt.mode === 'behind_text') patch.zIndex = 0;
                          if (opt.mode === 'in_front') patch.zIndex = 25;
                          onUpdateSettings(patch);
                        }}
                        title={`${opt.label} — ${opt.description}`}
                        className={`h-10 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                          active
                            ? 'border-[#2563eb] bg-blue-50 ring-1 ring-[#2563eb]'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <WordWrapIcon mode={opt.mode} active={active} />
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1.5 text-[10px] text-[#1d4ed8] font-semibold">
                  Mode actif : {activeWrapMeta.label}
                </div>
              </div>

              {/* Contrôles complémentaires (Opacité, Plan, Réinitialiser) */}
              <div className="border-t border-slate-200 pt-2 space-y-2 text-[11px]">
                <div>
                  <div className="flex justify-between text-slate-600 mb-0.5">
                    <span>Opacité</span>
                    <span className="font-mono font-bold">{settings?.opacity ?? 100}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={settings?.opacity ?? 100}
                    onChange={(e) =>
                      onUpdateSettings({ opacity: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-[#2563eb] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ zIndex: Math.max(-5, (settings?.zIndex ?? 10) - 2) })
                    }
                    className="flex-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 inline-flex items-center justify-center gap-1 cursor-pointer"
                    title="Reculer d'un plan"
                  >
                    <ArrowDown className="w-3 h-3" />
                    <span>Reculer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ zIndex: Math.min(30, (settings?.zIndex ?? 10) + 2) })
                    }
                    className="flex-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 inline-flex items-center justify-center gap-1 cursor-pointer"
                    title="Avancer d'un plan"
                  >
                    <ArrowUp className="w-3 h-3" />
                    <span>Avancer</span>
                  </button>
                </div>

                {onReset && (
                  <button
                    type="button"
                    onClick={onReset}
                    className="w-full px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Réinitialiser position</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
