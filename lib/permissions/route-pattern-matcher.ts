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

/**
 * Convert a route pattern to a regex
 * Replaces [param] with regex pattern to match any value
 */
export function patternToRegex(pattern: string): RegExp {
   // Step 1: Escape special regex characters (including [ and ])
   let regexPattern = pattern.replace(/[.+?^${}|\\[\]]/g, (char) => '\\' + char);

   // Step 2: Replace escaped [id], [slug], etc. with regex pattern
   regexPattern = regexPattern.replace(/\\\[([^\]]+)\\\]/g, '([^/]+)');

   // Step 3: Add anchors to match the entire string
   return new RegExp('^' + regexPattern + '$');
}

/**
 * Check if a URL matches a route pattern
 */
export function matchesPattern(pattern: string, url: string): boolean {
   const regex = patternToRegex(pattern);
   const result = regex.test(url);

   // Debug logging for pattern matching
   if (pattern.includes('[')) {
      console.log(`[matchesPattern] Pattern: ${pattern}, URL: ${url}, Regex: ${regex.source}, Result: ${result}`);
   }

   return result;
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
