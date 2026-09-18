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

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours < 24) {
    if (mins === 0) return `Expires in ${hours}h`;
    return `Expires in ${hours}h ${mins}m`;
  }

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days === 1) {
    return 'Expires tomorrow';
  }
  return `Expires in ${days} days`;
};

/**
 * Converts a Date into a string suitable for HTML5 datetime-local input in user's local timezone.
 */
export const toLocalISOString = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Formats a preview date string for the retention selector (e.g. "Today at 11:30 PM", "Tomorrow at 4:00 PM").
 */
export const formatExpirationPreview = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) {
    return `Today at ${timeStr}`;
  }
  if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  }
  const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  return `${dateStr} at ${timeStr}`;
};

/**
 * Calculates ISO expiration timestamp from preset or custom retention settings.
 * Accepts either a config object { preset, customMode, days, hours, minutes, specificDate }
 * or primitive arguments (preset, customValue, customUnit).
 */
export const calculateExpirationDate = (configOrPreset, customValue = 1, customUnit = 'hours') => {
  if (typeof configOrPreset === 'object' && configOrPreset !== null) {
    const config = configOrPreset;
    if (config.preset !== 'custom') {
      const days = Number(config.preset) || 30;
      return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    // Custom Mode: Specific Date & Time
    if (config.customMode === 'datetime' && config.specificDate) {
      const parsed = new Date(config.specificDate);
      if (!isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
        return parsed.toISOString();
      }
    }

    // Custom Mode: Duration (days + hours + minutes)
    const days = Math.max(0, parseInt(config.days, 10) || 0);
    const hours = Math.max(0, parseInt(config.hours, 10) || 0);
    const minutes = Math.max(0, parseInt(config.minutes, 10) || 0);

    let totalMs = (days * 24 * 60 + hours * 60 + minutes) * 60 * 1000;
    if (totalMs <= 0) {
      totalMs = 60 * 1000; // minimum 1 minute
    }
    return new Date(Date.now() + totalMs).toISOString();
  }

  // Backward compatibility with primitive call
  const preset = configOrPreset;
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
 * Deduces retention config from an existing note's timestamps.
 */
export const parseExistingRetention = (expiresAt, createdAt) => {
  const now = Date.now();
  const defaultDate = toLocalISOString(new Date(now + 2.5 * 60 * 60 * 1000));

  if (!expiresAt) {
    return {
      preset: 30,
      customMode: 'duration',
      days: 0,
      hours: 2,
      minutes: 30,
      specificDate: defaultDate
    };
  }

  const baseTime = createdAt ? new Date(createdAt).getTime() : now;
  const expTime = new Date(expiresAt).getTime();
  const totalLifespanMs = Math.max(0, expTime - baseTime);
  const diffMs = totalLifespanMs > 0 ? totalLifespanMs : Math.max(0, expTime - now);

  const marginMs = 10 * 60 * 1000;
  const isClose = (targetMs) => Math.abs(diffMs - targetMs) <= marginMs;

  if (isClose(1 * 24 * 60 * 60 * 1000)) {
    return { preset: 1, customMode: 'duration', days: 1, hours: 0, minutes: 0, specificDate: toLocalISOString(expTime) };
  }
  if (isClose(7 * 24 * 60 * 60 * 1000)) {
    return { preset: 7, customMode: 'duration', days: 7, hours: 0, minutes: 0, specificDate: toLocalISOString(expTime) };
  }
  if (isClose(30 * 24 * 60 * 60 * 1000)) {
    return { preset: 30, customMode: 'duration', days: 30, hours: 0, minutes: 0, specificDate: toLocalISOString(expTime) };
  }
  if (isClose(90 * 24 * 60 * 60 * 1000)) {
    return { preset: 90, customMode: 'duration', days: 90, hours: 0, minutes: 0, specificDate: toLocalISOString(expTime) };
  }

  // Custom calculation
  const totalMinutes = Math.max(1, Math.round(diffMs / (60 * 1000)));
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutesAfterDays = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingMinutesAfterDays / 60);
  const minutes = remainingMinutesAfterDays % 60;

  return {
    preset: 'custom',
    customMode: 'duration',
    days,
    hours,
    minutes,
    specificDate: toLocalISOString(expTime)
  };
};
