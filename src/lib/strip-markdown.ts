/**
 * Strip minimal markdown used in beach copy so meta tags stay plain text.
 * Order: links and ** before single *; inline code before * if overlapping.
 */
export function stripMarkdown(text: string): string {
  let s = text;
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/_([^_]+)_/g, "$1");
  return s;
}
