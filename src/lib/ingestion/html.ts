import * as cheerio from "cheerio";

/**
 * Convert article HTML (Substack export/RSS or website page) to clean plain
 * text suitable for chunking and embedding. Strips images, captions,
 * subscribe widgets, buttons, share links, and other non-educational chrome.
 */
export function htmlToText(html: string): string {
  const $ = cheerio.load(html);

  const removeSelectors = [
    "script",
    "style",
    "noscript",
    "iframe",
    "img",
    "figure",
    "figcaption",
    "picture",
    "svg",
    "form",
    "button",
    ".captioned-image-container",
    ".image-link",
    ".subscription-widget-wrap",
    ".subscription-widget",
    ".subscribe-widget",
    ".button-wrapper",
    ".embedded-post-wrap",
    ".embedded-publication-wrap",
    ".captioned-button-wrap",
    ".footnote-anchor",
    ".image-gallery-embed",
    ".youtube-wrap",
    ".tweet",
    ".instagram",
    ".poll-embed",
    ".digest-post-embed",
    ".file-embed-wrapper",
    ".community-highlight",
  ];
  $(removeSelectors.join(", ")).remove();

  // Preserve paragraph boundaries: insert breaks after block elements.
  $("p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, div").each((_, el) => {
    $(el).append("\n\n");
  });

  const text = $.root().text();
  return normalizeWhitespace(text);
}

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
