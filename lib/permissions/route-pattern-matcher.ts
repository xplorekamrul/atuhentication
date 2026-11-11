/**
 * Utility to match dynamic route patterns against actual URLs
 * Converts Next.js route patterns to regex for matching
 * 
 * Examples:
 * - Pattern: /employees/[id]/history
 * - URL: /employees/123/history matches
 * - URL: /employees/abc/history matches
 * - URL: /employees/123/manage does not match
 */

// In-memory cache for compiled route regex patterns
const regexCache = new Map<string, RegExp>();

/**
 * Convert a route pattern to a regex (memoized in memory)
 * Replaces [param] with regex pattern to match any value
 */
export function patternToRegex(pattern: string): RegExp {
   const cached = regexCache.get(pattern);
   if (cached) return cached;

   // Step 1: Escape special regex characters (including [ and ])
   let regexPattern = pattern.replace(/[.+?^${}|\\[\]]/g, (char) => '\\' + char);

   // Step 2: Replace escaped [id], [slug], etc. with regex pattern
   regexPattern = regexPattern.replace(/\\\[([^\]]+)\\\]/g, '([^/]+)');

   // Step 3: Add anchors to match the entire string
   const regex = new RegExp('^' + regexPattern + '$');
   regexCache.set(pattern, regex);
   return regex;
}

/**
 * Check if a URL matches a route pattern
 */
export function matchesPattern(pattern: string, url: string): boolean {
   // Fast-path: exact static match without regex
   if (pattern === url) return true;
   return patternToRegex(pattern).test(url);
}

/**
 * Get all matching patterns for a URL
 * Useful when a URL might match multiple patterns
 */
export function getMatchingPatterns(patterns: string[], url: string): string[] {
   return patterns.filter((pattern) => matchesPattern(pattern, url));
}

/**
 * Normalize a URL path for comparison
 * Removes trailing slashes and query parameters
 */
export function normalizePath(path: string): string {
   return path.split('?')[0].replace(/\/$/, '') || '/';
}
