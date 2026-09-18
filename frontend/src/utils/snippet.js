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

  const totalMinutes = Math.ceil(diffMs / (1000 * 60));
  if (totalMinutes <= 1) {
    return 'Expires in < 1m';
  }
  if (totalMinutes < 60) {
    return `Expires in ${totalMinutes}m`;
  }

  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (totalHours < 24) {
    return `Expires in ${totalHours}h`;
  }

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days === 1) {
    return 'Expires tomorrow';
  }
  return `Expires in ${days} days`;
};

/**
 * Calculates ISO expiration timestamp from preset or custom retention settings.
 *
 * @param {number|string} preset - 1 | 7 | 30 | 90 | 'custom'
 * @param {number|string} customValue - Numeric duration
 * @param {string} customUnit - 'minutes' | 'hours' | 'days'
 * @returns {string} ISO Date string
 */
export const calculateExpirationDate = (preset, customValue = 1, customUnit = 'hours') => {
  let ms = 0;
  if (preset === 'custom') {
    const val = Math.max(1, Math.min(10000, Number(customValue) || 1));
    if (customUnit === 'minutes') ms = val * 60 * 1000;
    else if (customUnit === 'hours') ms = val * 60 * 60 * 1000;
    else if (customUnit === 'days') ms = val * 24 * 60 * 60 * 1000;
    else ms = val * 60 * 60 * 1000;
  } else {
    const days = Number(preset) || 30;
    ms = days * 24 * 60 * 60 * 1000;
  }
  return new Date(Date.now() + ms).toISOString();
};

/**
 * Deduces retention preset and custom settings from an existing note's timestamps.
 *
 * @param {string|Date} expiresAt - Expiration timestamp
 * @param {string|Date} createdAt - Creation timestamp
 * @returns {{ preset: number|string, customValue: number, customUnit: string }}
 */
export const parseExistingRetention = (expiresAt, createdAt) => {
  if (!expiresAt) {
    return { preset: 30, customValue: 30, customUnit: 'days' };
  }
  const baseTime = createdAt ? new Date(createdAt).getTime() : Date.now();
  const expTime = new Date(expiresAt).getTime();
  const totalLifespanMs = Math.max(0, expTime - baseTime);

  // If createdAt was far in the past or missing, check remaining diff from now
  const diffMs = totalLifespanMs > 0 ? totalLifespanMs : (expTime - Date.now());

  // Check preset days (allow ±10 minutes margin)
  const marginMs = 10 * 60 * 1000;
  const isClose = (targetMs) => Math.abs(diffMs - targetMs) <= marginMs;

  if (isClose(1 * 24 * 60 * 60 * 1000)) return { preset: 1, customValue: 1, customUnit: 'days' };
  if (isClose(7 * 24 * 60 * 60 * 1000)) return { preset: 7, customValue: 7, customUnit: 'days' };
  if (isClose(30 * 24 * 60 * 60 * 1000)) return { preset: 30, customValue: 30, customUnit: 'days' };
  if (isClose(90 * 24 * 60 * 60 * 1000)) return { preset: 90, customValue: 90, customUnit: 'days' };

  // Otherwise, it's custom
  const totalMinutes = Math.round(diffMs / (60 * 1000));
  if (totalMinutes % (24 * 60) === 0 && totalMinutes >= 24 * 60) {
    return { preset: 'custom', customValue: Math.round(totalMinutes / (24 * 60)), customUnit: 'days' };
  }
  if (totalMinutes % 60 === 0 && totalMinutes >= 60) {
    return { preset: 'custom', customValue: Math.round(totalMinutes / 60), customUnit: 'hours' };
  }
  return { preset: 'custom', customValue: Math.max(1, totalMinutes), customUnit: 'minutes' };
};
