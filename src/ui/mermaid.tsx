'use client';

import { use, useEffect, useId, useState } from 'react';

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
}

/**
 * Mermaid diagram component with theme support
 *
 * Automatically detects dark/light mode when used with next-themes.
 * Renders on client-side only to avoid hydration issues.
 */
export function Mermaid({ chart, theme: themeOverride, themeCSS = 'margin: 1.5rem auto 0;' }: MermaidProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <MermaidContent chart={chart} themeOverride={themeOverride} themeCSS={themeCSS} />;
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
}

function MermaidContent({ chart, themeOverride, themeCSS }: MermaidContentProps) {
  const id = useId();

  // Try to get theme from next-themes if available
  let resolvedTheme: string = themeOverride ?? 'default';
  if (!themeOverride) {
    try {
      // Dynamic import to make next-themes optional
      const { useTheme } = require('next-themes');
      const themeContext = useTheme();
      resolvedTheme = themeContext.resolvedTheme === 'dark' ? 'dark' : 'default';
    } catch {
      // next-themes not available, use default
      resolvedTheme = 'default';
    }
  }

  const { default: mermaid } = use(
    cachePromise('mermaid', () => import('mermaid'))
  );

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    fontFamily: 'inherit',
    themeCSS,
    theme: resolvedTheme as any,
  });

  const { svg, bindFunctions } = use(
    cachePromise(`${chart}-${resolvedTheme}`, () => {
      return mermaid.render(id, chart.replaceAll('\\n', '\n'));
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
