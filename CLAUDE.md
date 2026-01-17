# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

fumadocs-mermaid is a lightweight NPM package that integrates Mermaid diagram support into Fumadocs (a React documentation framework). It provides both a React component and a remark plugin for automatic code block conversion.

## Repository Structure

This is a **monorepo** managed with pnpm workspaces:

```
fumadocs-mermaid/
├── packages/
│   └── fumadocs-mermaid/     # Main package (published to NPM)
│       ├── src/
│       │   ├── index.ts                  # Root export entry point
│       │   ├── remark-mdx-mermaid.ts     # Remark plugin
│       │   └── ui/
│       │       ├── index.ts              # UI export entry point
│       │       └── mermaid.tsx           # React component
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsdown.config.ts
│       └── .npmignore
├── example/                   # Example Fumadocs app (optional)
├── CLAUDE.md                  # This file
├── README.md
├── LICENSE
├── package.json               # Root workspace package.json
└── pnpm-workspace.yaml
```

## Build System

**Build Tool**: tsdown (switched from tsup to preserve 'use client' directive)
- Build outputs to `packages/fumadocs-mermaid/dist/` directory
- Generates ESM modules with TypeScript declarations
- Preserves React Server Component/Client Component boundaries

**Commands** (run from repository root):
- `pnpm build` - Build the package for production
- `pnpm dev` - Build with watch mode for development

**Commands** (run from `packages/fumadocs-mermaid/`):
- `pnpm build` - Build the package for production
- `pnpm dev` - Build with watch mode for development
- `pnpm clean` - Remove the dist directory
- `pnpm types:check` - Run TypeScript type checking without emitting files
- `pnpm prepare` - Runs automatically before publish (builds the package)

## Architecture

### Package Structure

The package has **two entry points** (defined in package.json exports):

1. **Root export** (`fumadocs-mermaid`): Server-side utilities
   - Entry: `packages/fumadocs-mermaid/src/index.ts`
   - Exports: `remarkMdxMermaid` remark plugin
   - Pure functions, no React dependencies

2. **UI export** (`fumadocs-mermaid/ui`): Client-side React components
   - Entry: `packages/fumadocs-mermaid/src/ui/index.ts`
   - Exports: `Mermaid` component
   - Marked with `'use client'` directive (requires client-side rendering)

### Key Files

**packages/fumadocs-mermaid/src/remark-mdx-mermaid.ts**
- Remark plugin that transforms mermaid code blocks into `<Mermaid />` MDX components
- Uses `unist-util-visit` to traverse the MDX AST
- Converts nodes in-place by mutating the tree (using `Object.assign`)
- Configurable language identifier (defaults to 'mermaid')
- **Code block attribute parsing**: Extracts attributes from code block meta string (e.g., `theme="dark" rowHeight="50"`) and passes them as a `config` prop to the Mermaid component

**packages/fumadocs-mermaid/src/ui/mermaid.tsx**
- Client-side React component for rendering diagrams
- Two-stage rendering pattern:
  1. `Mermaid` wrapper: Handles hydration safety with mounted state
  2. `MermaidContent`: Actual rendering logic using React 19's `use()` hook
- **Caching strategy**: Map-based cache for both mermaid library import and rendered diagrams
  - Cache key format: `"mermaid"` for library, `"{chart}-{theme}-{config}"` for renders
  - Prevents re-rendering same diagram with same theme and config
- **Theme integration**: Auto-detects theme via next-themes, re-renders on theme change
- **Lazy loading**: Dynamic import of mermaid library (client-side only)
- **Per-diagram configuration**: Uses Mermaid's `%%{init: ...}%%` directive for diagram-specific config isolation

### Per-Code-Block Configuration Feature

The package supports per-code-block Mermaid configuration through code fence meta attributes:

```markdown
\`\`\`mermaid theme="dark" rowHeight="50"
graph TD
  A --> B
\`\`\`
```

**Supported flat attributes** (automatically mapped to Mermaid's nested config):
- `theme` - Mermaid theme (default, dark, neutral, forest)
- Packet diagram: `rowHeight`, `bitsPerRow`, `showBits`
- Flowchart: `nodeSpacing`, `rankSpacing`, `curve`
- Sequence: `mirrorActors`, `messageAlign`

**Implementation details**:
1. The remark plugin parses the meta string using a regex that extracts `key="value"` pairs
2. Attributes are serialized as JSON and passed to the `<Mermaid config="..." />` component
3. The component builds a Mermaid config object and injects it as an init directive (`%%{init: ...}%%`) prepended to the chart
4. This approach provides per-diagram isolation without global state pollution

### Important Implementation Details

1. **'use client' directive**: The UI export MUST preserve this directive. tsdown (not tsup) is used to maintain it through the build process.

2. **Hydration safety**: The component uses a mounted state to prevent server/client mismatches, returning `null` until client-side mount completes.

3. **React 19 `use()` hook**: Used for reading promises synchronously in render. This requires React 18+ Suspense boundaries in consuming applications.

4. **Dual package exports**: The package.json carefully separates server and client code. Never import React in the root export.

5. **Init directive pattern**: Per-diagram config uses Mermaid's init directive (`%%{init: {...}}%%`) prepended to each chart, enabling isolated configuration per diagram.

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
3. **Cache invalidation**: Diagram cache includes theme AND config in key. Changing chart, theme, OR config triggers new render.
4. **AST mutation**: The remark plugin mutates nodes in place. This is intentional and follows remark conventions.
5. **Monorepo commands**: Run build commands from root with `pnpm build` or from the package directory.

## Example App

The `example/` directory can contain a Fumadocs application demonstrating the package usage. When working on the example:
- It's included in the pnpm workspace
- Can reference the local package via workspace protocol
- Useful for testing changes during development
