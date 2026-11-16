import React, { useEffect, useRef, useState } from 'react';

interface ResponsivePaperWrapperProps {
  paperWidthPx: number;
  minPaperHeightPx?: number;
  manualZoomPct?: number;
  bypassScale?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Enveloppe responsive qui met à l'échelle proportionnellement les feuilles A4 / Letter
 * sur mobile et tablette sans débordement horizontal ni rognage du document.
 */
export const ResponsivePaperWrapper: React.FC<ResponsivePaperWrapperProps> = ({
  paperWidthPx,
  minPaperHeightPx = 1122,
  manualZoomPct = 100,
  bypassScale = false,
  className = '',
  children
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState<number>(paperWidthPx);
  const [contentHeight, setContentHeight] = useState<number>(minPaperHeightPx);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setAvailableWidth(w);
    };
    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measureH = () => {
      const h = el.scrollHeight || el.offsetHeight || minPaperHeightPx;
      setContentHeight(Math.max(minPaperHeightPx, h));
    };
    measureH();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measureH);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [minPaperHeightPx, children]);

  const userZoom = Math.max(0.4, Math.min(2.0, manualZoomPct / 100));
  const autoFitScale = availableWidth < paperWidthPx ? Math.max(0.28, (availableWidth - 8) / paperWidthPx) : 1;
  const effectiveScale = bypassScale ? 1 : availableWidth < paperWidthPx ? autoFitScale : userZoom;
  const needsScroll = !bypassScale && effectiveScale * paperWidthPx > availableWidth + 2;

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-full ${needsScroll ? 'overflow-x-auto' : 'overflow-x-hidden'} ${className}`}
    >
      <div
        className="mx-auto relative transition-all duration-150"
        style={
          bypassScale
            ? { width: `${paperWidthPx}px` }
            : {
                width: `${Math.round(paperWidthPx * effectiveScale)}px`,
                height: `${Math.round(contentHeight * effectiveScale)}px`
              }
        }
      >
        <div
          ref={contentRef}
          style={
            bypassScale
              ? { width: `${paperWidthPx}px` }
              : {
                  width: `${paperWidthPx}px`,
                  transform: `scale(${effectiveScale})`,
                  transformOrigin: 'top left'
                }
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
};
