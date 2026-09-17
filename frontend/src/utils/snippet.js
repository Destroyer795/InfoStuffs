/**
 * Strips markdown syntax, code blocks, images, links, and table formatting
 * to generate a clean, readable multi-line or single-line plain text snippet.
 *
 * @param {string} rawMarkdown - The raw markdown text content.
 * @param {number} length - Maximum character length before adding an ellipsis.
 * @returns {string} Sanitized plain text snippet.
 */
export const generateCleanSnippet = (rawMarkdown, length = 120) => {
  if (!rawMarkdown || typeof rawMarkdown !== 'string') {
    return 'No content...';
  }

  const cleanText = rawMarkdown
    // Strip fenced code blocks entirely: ```lang ... ```
    .replace(/```[\s\S]*?```/g, ' ')
    // Strip inline code blocks: `code` -> code
    .replace(/`([^`]+)`/g, '$1')
    // Strip image syntax: ![alt](url) -> alt
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Strip link syntax: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Strip HTML tags: <tag>...</tag>
    .replace(/<[^>]*>/g, ' ')
    // Strip markdown headings: # Heading
    .replace(/^#+\s+/gm, '')
    // Strip markdown formatting symbols: bold, italics, strikethrough, blockquote markers
    .replace(/[*_~>]/g, '')
    // Strip table formatting: pipes and dashes (| Header | --- |)
    .replace(/[|\u2014-]{2,}/g, ' ')
    .replace(/[|]/g, ' ')
    // Strip markdown bullet points and list numbers at line starts
    .replace(/^(\s*[-*+]\s+|\s*\d+\.\s+)/gm, '')
    // Collapse multiple whitespace and newlines into a single clean space
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) {
    return 'Empty note...';
  }

  if (cleanText.length <= length) {
    return cleanText;
  }

  // Truncate cleanly at word boundary if possible
  const truncated = cleanText.substring(0, length);
  const lastSpace = truncated.lastIndexOf(' ');
  const cleanTruncated = lastSpace > length * 0.75 ? truncated.substring(0, lastSpace) : truncated;

  return `${cleanTruncated.trim()}...`;
};

/**
 * Returns a human-friendly expiration countdown label for temporary notes.
 *
 * @param {string|Date} expiresAt - Target expiration timestamp.
 * @param {string|Date} createdAt - Fallback creation timestamp for legacy notes.
 * @returns {string} Humanized countdown string, e.g. "Expires in 3 days".
 */
export const formatExpirationLabel = (expiresAt, createdAt) => {
  let targetDate = expiresAt ? new Date(expiresAt) : null;

  // Fallback for legacy temporary notes created before expiresAt was introduced (30-day default)
  if (!targetDate && createdAt) {
    targetDate = new Date(new Date(createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  if (!targetDate || isNaN(targetDate.getTime())) {
    return 'Temporary note';
  }

  const diffMs = targetDate.getTime() - Date.now();
  if (diffMs <= 0) {
    return 'Expired (pending cleanup)';
  }

  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (hours < 1) {
    return 'Expires in < 1 hr';
  }
  if (hours < 24) {
    return `Expires in ${hours}h`;
  }

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days === 1) {
    return 'Expires tomorrow';
  }
  return `Expires in ${days} days`;
};
