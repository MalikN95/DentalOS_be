const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

// Plain-text email bodies have no markup — this gives them a readable HTML
// alternative part without pulling in a markdown/templating dependency.
export const textToHtml = (text: string): string =>
  escapeHtml(text).replace(/\n/g, '<br>');
