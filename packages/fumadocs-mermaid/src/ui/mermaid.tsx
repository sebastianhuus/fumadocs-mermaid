'use client';

import { type ReactNode, type RefCallback, use, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { Copy, Check, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export interface MermaidProps {
  /**
   * The mermaid diagram chart definition
   */
  chart: string;

  /**
   * Optional theme override. If not provided, will use the theme from next-themes context.
   * @defaultValue 'default' for light, 'dark' for dark mode
   */
  theme?: 'default' | 'dark' | 'neutral' | 'forest';

  /**
   * Additional CSS for the diagram container
   */
  themeCSS?: string;

  /**
   * Configuration from code block attributes.
   * JSON string with flat attributes or nested config.
   */
  config?: string;

  /**
   * When true, shows a hover overlay with copy (PNG) and download (SVG) buttons.
   */
  exportable?: string;

  /**
   * When true, enables pan and zoom on the rendered diagram.
   */
  zoomable?: string;
}

interface MermaidConfig {
  theme?: string;
  themeCSS?: string;
  packet?: {
    rowHeight?: number;
    bitsPerRow?: number;
    showBits?: boolean;
  };
  flowchart?: {
    nodeSpacing?: number;
    rankSpacing?: number;
    curve?: string;
  };
  sequence?: {
    mirrorActors?: boolean;
    messageAlign?: string;
  };
  [key: string]: unknown;
}

/**
 * Build Mermaid config from flat attributes parsed from code block meta.
 * Maps flat attributes to Mermaid's nested configuration structure.
 */
function buildMermaidConfig(configStr: string | undefined, themeOverride: string | undefined): MermaidConfig {
  if (!configStr) {
    return themeOverride ? { theme: themeOverride } : {};
  }

  let parsed: Record<string, string | null>;
  try {
    parsed = JSON.parse(configStr);
  } catch {
    return themeOverride ? { theme: themeOverride } : {};
  }

  // Check if it's already a nested config (has 'config' key)
  if (parsed.config) {
    try {
      const nestedConfig = JSON.parse(parsed.config as string);
      // Merge with any flat attributes
      const result: MermaidConfig = { ...nestedConfig };
      if (parsed.theme) result.theme = parsed.theme as string;
      if (themeOverride) result.theme = themeOverride;
      return result;
    } catch {
      // Fall through to flat attribute handling
    }
  }

  const config: MermaidConfig = {};

  // Theme: code block attribute takes priority, then fall back to system theme
  if (parsed.theme) {
    config.theme = parsed.theme;
  } else if (themeOverride) {
    config.theme = themeOverride;
  }

  // Packet diagram options
  const packetOptions: MermaidConfig['packet'] = {};
  if (parsed.rowHeight) packetOptions.rowHeight = parseInt(parsed.rowHeight, 10);
  if (parsed.bitsPerRow) packetOptions.bitsPerRow = parseInt(parsed.bitsPerRow, 10);
  if (parsed.showBits) packetOptions.showBits = parsed.showBits === 'true';
  if (Object.keys(packetOptions).length > 0) config.packet = packetOptions;

  // Flowchart options
  const flowchartOptions: MermaidConfig['flowchart'] = {};
  if (parsed.nodeSpacing) flowchartOptions.nodeSpacing = parseInt(parsed.nodeSpacing, 10);
  if (parsed.rankSpacing) flowchartOptions.rankSpacing = parseInt(parsed.rankSpacing, 10);
  if (parsed.curve) flowchartOptions.curve = parsed.curve;
  if (Object.keys(flowchartOptions).length > 0) config.flowchart = flowchartOptions;

  // Sequence diagram options
  const sequenceOptions: MermaidConfig['sequence'] = {};
  if (parsed.mirrorActors) sequenceOptions.mirrorActors = parsed.mirrorActors === 'true';
  if (parsed.messageAlign) sequenceOptions.messageAlign = parsed.messageAlign;
  if (Object.keys(sequenceOptions).length > 0) config.sequence = sequenceOptions;

  return config;
}

/**
 * Mermaid diagram component with theme support
 *
 * Automatically detects dark/light mode when used with next-themes.
 * Renders on client-side only to avoid hydration issues.
 */
export function Mermaid({ chart, theme: themeOverride, themeCSS = 'margin: 1.5rem auto 0;', config, exportable, zoomable }: MermaidProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <MermaidContent chart={chart} themeOverride={themeOverride} themeCSS={themeCSS} config={config} exportable={exportable === 'true'} zoomable={zoomable === 'true'} />;
}

// Cache for mermaid library and rendered diagrams
const cache = new Map<string, Promise<unknown>>();

function cachePromise<T>(key: string, setPromise: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached as Promise<T>;

  const promise = setPromise();
  cache.set(key, promise);
  return promise;
}

interface MermaidContentProps {
  chart: string;
  themeOverride?: string;
  themeCSS: string;
  config?: string;
  exportable: boolean;
  zoomable: boolean;
}

function svgToPngBlob(svgElement: SVGSVGElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const viewBox = svgElement.getAttribute('viewBox');
    let width = svgElement.width.baseVal.value || 800;
    let height = svgElement.height.baseVal.value || 600;
    if (viewBox) {
      const parts = viewBox.split(/\s+|,/).map(Number);
      if (parts.length === 4) {
        width = parts[2];
        height = parts[3];
      }
    }

    const scale = 2;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create PNG blob'));
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG image'));
    };
    img.src = url;
  });
}

function ExportButtons({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [copied, onCopy] = useCopyButton(async () => {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const blob = await svgToPngBlob(svgEl);
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
  });

  const handleDownload = useCallback(() => {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [containerRef]);

  return (
    <>
      <button
        type="button"
        className={buttonVariants({ size: 'icon-sm', color: 'outline' })}
        onClick={onCopy}
        aria-label="Copy as PNG"
      >
        {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
      </button>
      <button
        type="button"
        className={buttonVariants({ size: 'icon-sm', color: 'outline' })}
        onClick={handleDownload}
        aria-label="Download as SVG"
      >
        <Download style={{ width: 14, height: 14 }} />
      </button>
    </>
  );
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

interface ZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface ZoomActions {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

function ZoomButtons({ actionsRef }: { actionsRef: React.RefObject<ZoomActions | null> }) {
  return (
    <>
      <button
        type="button"
        className={buttonVariants({ size: 'icon-sm', color: 'outline' })}
        onClick={() => actionsRef.current?.zoomIn()}
        aria-label="Zoom in"
      >
        <ZoomIn style={{ width: 14, height: 14 }} />
      </button>
      <button
        type="button"
        className={buttonVariants({ size: 'icon-sm', color: 'outline' })}
        onClick={() => actionsRef.current?.zoomOut()}
        aria-label="Zoom out"
      >
        <ZoomOut style={{ width: 14, height: 14 }} />
      </button>
      <button
        type="button"
        className={buttonVariants({ size: 'icon-sm', color: 'outline' })}
        onClick={() => actionsRef.current?.reset()}
        aria-label="Reset zoom"
      >
        <RotateCcw style={{ width: 14, height: 14 }} />
      </button>
    </>
  );
}

function ZoomableViewport({ children, actionsRef }: { children: ReactNode; actionsRef: React.MutableRefObject<ZoomActions | null> }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ZoomState>({ scale: 1, translateX: 0, translateY: 0 });
  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const applyTransform = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    const { scale, translateX, translateY } = stateRef.current;
    el.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  }, []);

  const clampScale = useCallback((s: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s)), []);

  // Attach wheel handler imperatively with { passive: false } so
  // preventDefault() works and the page doesn't scroll while zooming.
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = outer.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const state = stateRef.current;
      const oldScale = state.scale;
      const newScale = clampScale(oldScale + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));

      state.translateX = cursorX - (cursorX - state.translateX) * (newScale / oldScale);
      state.translateY = cursorY - (cursorY - state.translateY) * (newScale / oldScale);
      state.scale = newScale;

      applyTransform();
    };

    outer.addEventListener('wheel', handleWheel, { passive: false });
    return () => outer.removeEventListener('wheel', handleWheel);
  }, [applyTransform, clampScale]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    draggingRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const outer = outerRef.current;
    if (outer) outer.style.cursor = 'grabbing';
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    stateRef.current.translateX += dx;
    stateRef.current.translateY += dy;
    applyTransform();
  }, [applyTransform]);

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
    const outer = outerRef.current;
    if (outer) outer.style.cursor = 'grab';
  }, []);

  const zoomIn = useCallback(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const state = stateRef.current;
    const rect = outer.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const oldScale = state.scale;
    const newScale = clampScale(oldScale + ZOOM_STEP);
    state.translateX = cx - (cx - state.translateX) * (newScale / oldScale);
    state.translateY = cy - (cy - state.translateY) * (newScale / oldScale);
    state.scale = newScale;
    applyTransform();
  }, [applyTransform, clampScale]);

  const zoomOut = useCallback(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const state = stateRef.current;
    const rect = outer.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const oldScale = state.scale;
    const newScale = clampScale(oldScale - ZOOM_STEP);
    state.translateX = cx - (cx - state.translateX) * (newScale / oldScale);
    state.translateY = cy - (cy - state.translateY) * (newScale / oldScale);
    state.scale = newScale;
    applyTransform();
  }, [applyTransform, clampScale]);

  const reset = useCallback(() => {
    stateRef.current = { scale: 1, translateX: 0, translateY: 0 };
    applyTransform();
  }, [applyTransform]);

  // Expose zoom actions to parent
  useEffect(() => {
    actionsRef.current = { zoomIn, zoomOut, reset };
    return () => { actionsRef.current = null; };
  }, [actionsRef, zoomIn, zoomOut, reset]);

  return (
    <div
      ref={outerRef}
      style={{
        overflow: 'hidden',
        borderRadius: '8px',
        border: '1px solid var(--fd-border, #e5e7eb)',
        cursor: 'grab',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        ref={innerRef}
        style={{ transformOrigin: '0 0' }}
      >
        {children}
      </div>
    </div>
  );
}

function MermaidContent({ chart, themeOverride, themeCSS, config: configStr, exportable, zoomable }: MermaidContentProps) {
  const id = useId();
  const { resolvedTheme: systemTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Use override if provided, otherwise use system theme, fallback to 'default'
  const resolvedTheme = themeOverride ?? (systemTheme === 'dark' ? 'dark' : 'default');

  const { default: mermaid } = use(
    cachePromise('mermaid', () => import('mermaid'))
  );

  // Minimal global init - just basics
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    fontFamily: 'inherit',
  });

  // Build per-diagram config
  const diagramConfig = buildMermaidConfig(configStr, resolvedTheme);
  diagramConfig.themeCSS = themeCSS;

  // Prepend init directive for per-diagram isolation
  const initDirective = `%%{init: ${JSON.stringify(diagramConfig)}}%%\n`;
  const fullChart = initDirective + chart.replaceAll('\\n', '\n');

  const { svg, bindFunctions } = use(
    cachePromise(`${chart}-${resolvedTheme}-${configStr ?? ''}`, () => {
      return mermaid.render(id, fullChart);
    })
  );

  const refCallback: RefCallback<HTMLDivElement> = useCallback((node) => {
    if (node) {
      containerRef.current = node;
      bindFunctions?.(node);
    }
  }, [bindFunctions]);

  const zoomActionsRef = useRef<ZoomActions | null>(null);

  const svgDiv = (
    <div
      ref={refCallback}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );

  const hasToolbar = exportable || zoomable;

  const diagram = zoomable
    ? <ZoomableViewport actionsRef={zoomActionsRef}>{svgDiv}</ZoomableViewport>
    : svgDiv;

  if (!hasToolbar) return diagram;

  // When zoomable, toolbar is always visible.
  // When only exportable, toolbar fades in on hover.
  const alwaysVisible = zoomable;

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={!alwaysVisible ? (e) => {
        const toolbar = e.currentTarget.querySelector('[data-diagram-toolbar]') as HTMLElement | null;
        if (toolbar) toolbar.style.opacity = '1';
      } : undefined}
      onMouseLeave={!alwaysVisible ? (e) => {
        const toolbar = e.currentTarget.querySelector('[data-diagram-toolbar]') as HTMLElement | null;
        if (toolbar) toolbar.style.opacity = '0';
      } : undefined}
    >
      {diagram}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '4px',
          opacity: alwaysVisible ? 1 : 0,
          transition: alwaysVisible ? undefined : 'opacity 150ms',
          zIndex: 1,
        }}
        data-diagram-toolbar
      >
        {exportable && <ExportButtons containerRef={containerRef} />}
        {zoomable && <ZoomButtons actionsRef={zoomActionsRef} />}
      </div>
    </div>
  );
}
