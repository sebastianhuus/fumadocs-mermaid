'use client';

import { use, useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';

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
export function Mermaid({ chart, theme: themeOverride, themeCSS = 'margin: 1.5rem auto 0;', config }: MermaidProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <MermaidContent chart={chart} themeOverride={themeOverride} themeCSS={themeCSS} config={config} />;
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
}

function MermaidContent({ chart, themeOverride, themeCSS, config: configStr }: MermaidContentProps) {
  const id = useId();
  const { resolvedTheme: systemTheme } = useTheme();

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

  return (
    <div
      ref={(container) => {
        if (container) bindFunctions?.(container);
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
