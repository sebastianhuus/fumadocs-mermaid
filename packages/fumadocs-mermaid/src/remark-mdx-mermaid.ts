import { visit } from 'unist-util-visit';
import type { Transformer } from 'unified';
import type { Root } from 'mdast';

interface MdxJsxAttribute {
  type: 'mdxJsxAttribute';
  name: string;
  value: string;
}

interface MdxJsxFlowElement {
  type: 'mdxJsxFlowElement';
  name: string;
  attributes: MdxJsxAttribute[];
  children: unknown[];
}

interface CodeBlockAttributes {
  attributes: Record<string, string | null>;
  rest: string;
}

/**
 * Parse code block attributes from meta string.
 * Supports formats like: theme="dark" rowHeight="50" or theme='dark'
 */
function parseCodeBlockAttributes(meta: string): CodeBlockAttributes {
  let str = meta;
  const regex = /(?<=^|\s)(\w+)(?:=(?:"([^"]*)"|'([^']*)'))?/g;
  const attributes: Record<string, string | null> = {};

  str = str.replaceAll(regex, (match, name, value1, value2) => {
    attributes[name] = value1 ?? value2 ?? null;
    return '';
  });

  return { rest: str.trim(), attributes };
}

function toMDX(code: string, config: Record<string, string | null>): MdxJsxFlowElement {
  const attributes: MdxJsxAttribute[] = [
    {
      type: 'mdxJsxAttribute',
      name: 'chart',
      value: code.trim(),
    },
  ];

  // Only add config attribute if there are config options
  if (Object.keys(config).length > 0) {
    attributes.push({
      type: 'mdxJsxAttribute',
      name: 'config',
      value: JSON.stringify(config),
    });
  }

  return {
    type: 'mdxJsxFlowElement',
    name: 'Mermaid',
    attributes,
    children: [],
  };
}

export interface RemarkMdxMermaidOptions {
  /**
   * The language identifier for mermaid code blocks
   * @defaultValue 'mermaid'
   */
  lang?: string;
}

/**
 * Remark plugin to convert mermaid code blocks into `<Mermaid />` MDX components
 *
 * @example
 * ```ts
 * import { remarkMdxMermaid } from 'fumadocs-mermaid';
 * import { defineConfig } from 'fumadocs-mdx/config';
 *
 * export default defineConfig({
 *   mdxOptions: {
 *     remarkPlugins: [remarkMdxMermaid],
 *   },
 * });
 * ```
 *
 * @example Per-code-block configuration
 * ```markdown
 * \`\`\`mermaid theme="dark" rowHeight="50"
 * graph TD
 *   A --> B
 * \`\`\`
 * ```
 */
export function remarkMdxMermaid(options: RemarkMdxMermaidOptions = {}): Transformer<Root, Root> {
  const { lang = 'mermaid' } = options;

  return (tree: Root) => {
    visit(tree, 'code', (node) => {
      if (node.lang !== lang || !node.value) return;

      const { attributes } = parseCodeBlockAttributes(node.meta ?? '');
      Object.assign(node, toMDX(node.value, attributes));
    });
  };
}
