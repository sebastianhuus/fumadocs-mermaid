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

function toMDX(code: string): MdxJsxFlowElement {
  return {
    type: 'mdxJsxFlowElement',
    name: 'Mermaid',
    attributes: [
      {
        type: 'mdxJsxAttribute',
        name: 'chart',
        value: code.trim(),
      },
    ],
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
 */
export function remarkMdxMermaid(options: RemarkMdxMermaidOptions = {}): Transformer<Root, Root> {
  const { lang = 'mermaid' } = options;

  return (tree) => {
    visit(tree, 'code', (node) => {
      if (node.lang !== lang || !node.value) return;

      Object.assign(node, toMDX(node.value));
    });
  };
}
