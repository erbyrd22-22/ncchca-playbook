import DOMPurify from 'isomorphic-dompurify';

/**
 * Editable playbook fields accept a small amount of inline formatting and
 * nothing else. Anything a contenteditable field or a paste can produce
 * beyond this list is stripped before it reaches the database — so the
 * `dangerouslySetInnerHTML` on the read path is only ever handed
 * already-cleaned markup.
 */
const INLINE = {
  ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'span', 'code', 'a'],
  ALLOWED_ATTR: ['href', 'title'],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#)/i,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['style', 'srcset', 'formaction'],
};

/** Longer body copy — same rules plus paragraphs and lists. */
const BLOCK = {
  ...INLINE,
  ALLOWED_TAGS: [...INLINE.ALLOWED_TAGS, 'p', 'ul', 'ol', 'li'],
};

export function cleanInline(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, INLINE).trim();
}

export function cleanBlock(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, BLOCK).trim();
}

/** Plain text only — titles, ledes, names. Strips every tag. */
export function cleanText(s: string | null | undefined): string {
  if (!s) return '';
  return DOMPurify.sanitize(s, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}
