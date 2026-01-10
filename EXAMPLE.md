# Example Usage

This file demonstrates how to integrate fumadocs-mermaid into your Fumadocs project.

## Step 1: Install Dependencies

```bash
pnpm add fumadocs-mermaid mermaid next-themes
```

## Step 2: Configure Source (Fumadocs MDX)

```ts
// source.config.ts
import { remarkMdxMermaid } from 'fumadocs-mermaid';
import { defineConfig } from 'fumadocs-mdx/config';

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMdxMermaid],
  },
});
```

## Step 3: Register MDX Component

```tsx
// mdx-components.tsx
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Mermaid } from 'fumadocs-mermaid/ui';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Mermaid,
    ...components,
  };
}
```

## Step 4: Use in Your MDX Files

### Using Code Blocks (Recommended)

````mdx
---
title: My Documentation Page
---

# Architecture Overview

Here's our system architecture:

```mermaid
graph TB
    Client[Client Application]
    API[API Gateway]
    Auth[Auth Service]
    DB[(Database)]
    Cache[(Redis Cache)]

    Client --> API
    API --> Auth
    API --> DB
    API --> Cache
    Auth --> DB
```

## User Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: Enter credentials
    Frontend->>Backend: POST /login
    Backend->>Database: Verify credentials
    Database-->>Backend: User data
    Backend-->>Frontend: JWT token
    Frontend-->>User: Redirect to dashboard
```
````

### Using Component Directly

```mdx
---
title: Custom Diagram
---

<Mermaid
  chart="
graph LR
    A[Square Rect] -- Link text --> B((Circle))
    A --> C(Round Rect)
    B --> D{Rhombus}
    C --> D
"
  theme="dark"
/>
```

## Advanced: Different Frameworks

### Next.js (App Router)

```tsx
// app/docs/[[...slug]]/page.tsx
import { source } from '@/lib/source';
import { DocsPage, DocsBody } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: { slug?: string[] } }) {
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      <DocsBody>
        <MDX />
      </DocsBody>
    </DocsPage>
  );
}
```

### Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { fumadocsVitePlugin } from 'fumadocs-mdx/vite';
import { remarkMdxMermaid } from 'fumadocs-mermaid';

export default defineConfig({
  plugins: [
    fumadocsVitePlugin({
      mdxOptions: {
        remarkPlugins: [remarkMdxMermaid],
      },
    }),
  ],
});
```

## Mermaid Diagram Types

### Flowchart

```mermaid
graph TD
    Start[Start] --> Decision{Is it working?}
    Decision -->|Yes| Great[Great!]
    Decision -->|No| Debug[Debug]
    Debug --> Decision
    Great --> End[End]
```

### Sequence Diagram

```mermaid
sequenceDiagram
    Alice->>+John: Hello John!
    John-->>-Alice: Hi Alice!
```

### Class Diagram

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    Animal <|-- Dog
```

### State Diagram

```mermaid
stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]
```

### Entity Relationship Diagram

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string custNumber
        string sector
    }
    ORDER {
        int orderNumber
        string deliveryAddress
    }
    LINE-ITEM {
        string productCode
        int quantity
        float pricePerUnit
    }
```

### Gantt Chart

```mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Planning
    Research           :a1, 2024-01-01, 30d
    Design            :a2, after a1, 20d
    section Development
    Frontend          :2024-02-20, 45d
    Backend           :2024-02-20, 60d
    section Testing
    QA Testing        :2024-04-21, 14d
```

### Pie Chart

```mermaid
pie title Technology Stack
    "React" : 40
    "TypeScript" : 30
    "Node.js" : 20
    "Other" : 10
```
