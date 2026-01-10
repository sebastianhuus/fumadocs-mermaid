# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

fumadocs-mermaid is a lightweight NPM package that integrates Mermaid diagram support into Fumadocs (a React documentation framework). It provides both a React component and a remark plugin for automatic code block conversion.

## Build System

**Build Tool**: tsdown (switched from tsup to preserve 'use client' directive)
- Build outputs to `dist/` directory
- Generates ESM modules with TypeScript declarations
- Preserves React Server Component/Client Component boundaries

**Commands**:
- `pnpm build` - Build the package for production
- `pnpm dev` - Build with watch mode for development
- `pnpm clean` - Remove the dist directory
- `pnpm types:check` - Run TypeScript type checking without emitting files
- `pnpm prepare` - Runs automatically before publish (builds the package)

## Architecture

### Package Structure

The package has **two entry points** (defined in package.json exports):

1. **Root export** (`fumadocs-mermaid`): Server-side utilities
   - Entry: `src/index.ts`
   - Exports: `remarkMdxMermaid` remark plugin
   - Pure functions, no React dependencies

2. **UI export** (`fumadocs-mermaid/ui`): Client-side React components
   - Entry: `src/ui/index.ts`
   - Exports: `Mermaid` component
   - Marked with `'use client'` directive (requires client-side rendering)

### Key Files

**src/remark-mdx-mermaid.ts**
- Remark plugin that transforms mermaid code blocks into `<Mermaid />` MDX components
- Uses `unist-util-visit` to traverse the MDX AST
- Converts nodes in-place by mutating the tree (using `Object.assign`)
- Configurable language identifier (defaults to 'mermaid')

**src/ui/mermaid.tsx**
- Client-side React component for rendering diagrams
- Two-stage rendering pattern:
  1. `Mermaid` wrapper: Handles hydration safety with mounted state
  2. `MermaidContent`: Actual rendering logic using React 19's `use()` hook
- **Caching strategy**: Map-based cache for both mermaid library import and rendered diagrams
  - Cache key format: `"mermaid"` for library, `"{chart}-{theme}"` for renders
  - Prevents re-rendering same diagram with same theme
- **Theme integration**: Auto-detects theme via next-themes, re-renders on theme change
- **Lazy loading**: Dynamic import of mermaid library (client-side only)

### Important Implementation Details

1. **'use client' directive**: The UI export MUST preserve this directive. tsdown (not tsup) is used to maintain it through the build process.

2. **Hydration safety**: The component uses a mounted state to prevent server/client mismatches, returning `null` until client-side mount completes.

3. **React 19 `use()` hook**: Used for reading promises synchronously in render. This requires React 18+ Suspense boundaries in consuming applications.

4. **Dual package exports**: The package.json carefully separates server and client code. Never import React in the root export.

## Dependencies

**Runtime**:
- `unist-util-visit` - AST traversal for remark plugin

**Peer dependencies** (required by consumers):
- `mermaid` ^10.0.0 || ^11.0.0
- `next-themes` (any version)
- `react` ^18.0.0 || ^19.0.0

**Dev dependencies**: Include TypeScript, React types, and tsdown for building

## Common Pitfalls

1. **Don't use tsup**: It strips 'use client' directives. Use tsdown instead.
2. **Maintain export separation**: Server utilities in root export, React components in /ui export
3. **Cache invalidation**: Diagram cache includes theme in key. Changing chart OR theme triggers new render.
4. **AST mutation**: The remark plugin mutates nodes in place. This is intentional and follows remark conventions.
