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
