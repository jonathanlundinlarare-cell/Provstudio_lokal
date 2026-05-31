import katex from "katex";

/**
 * Renderar en KaTeX-formel till en HTML-sträng.
 * Returnerar en tom sträng om källan är tom.
 * Vid fel: returnerar källan insvept i ett <code>-element.
 */
export function renderKatex(src: string): string {
  if (!src.trim()) return "";
  try {
    return katex.renderToString(src, { throwOnError: false, displayMode: true });
  } catch {
    return `<code style="font-family:monospace">${src}</code>`;
  }
}
