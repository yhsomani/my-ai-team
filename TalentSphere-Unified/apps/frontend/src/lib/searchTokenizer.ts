/**
 * TalentSphere Search Tokenization Pipeline
 * Custom text processing for search indexing
 */

export const STOP_WORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any',
  'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between',
  'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he',
  'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in',
  'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'will', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Simple stemmer using regex rules
 */
export const stemmer = (word: string): string => {
  let w = word.toLowerCase();
  
  const rules: Array<[RegExp, string]> = [
    [/sses$/i, 'ss'],
    [/ies$/i, 'y'],
    [/ss$/i, 'ss'],
    [/s$/i, ''],
    [/eed$/i, 'ee'],
    [/ing$/i, ''],
    [/ed$/i, ''],
    [/ment$/i, ''],
    [/ness$/i, ''],
    [/ly$/i, ''],
    [/ful$/i, ''],
    [/able$/i, 'able'],
    [/ible$/i, 'ible'],
    [/ing$/i, ''],
    [/tion$/i, 'tion'],
    [/sion$/i, 'sion'],
  ];
  
  for (const [pattern, replacement] of rules) {
    if (pattern.test(w)) {
      w = w.replace(pattern, replacement);
      break;
    }
  }
  
  return w;
};

/**
 * Trims whitespace and normalizes text
 */
export const trimmer = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '');
};

/**
 * Filters stop words from token list
 */
export const stopWordFilter = (tokens: string[]): string[] => {
  return tokens.filter(token => !STOP_WORDS.has(token.toLowerCase()));
};

/**
 * Tokenizes a search query using the full pipeline
 */
export const tokenize = (query: string): string[] => {
  const trimmed = trimmer(query);
  const tokens = trimmed.split(/\s+/).filter(t => t.length > 1);
  const stemmed = tokens.map(stemmer);
  return stopWordFilter(stemmed);
};

/**
 * Builds a search-optimized query string
 */
export const buildSearchQuery = (input: string): string => {
  const tokens = tokenize(input);
  return tokens.join(' ');
};

/**
 * Calculates relevance score based on token matches
 */
export const calculateRelevance = (
  indexedTokens: string[],
  queryTokens: string[]
): number => {
  if (queryTokens.length === 0) return 0;
  
  const matches = queryTokens.filter(qt => indexedTokens.includes(qt)).length;
  return matches / queryTokens.length;
};