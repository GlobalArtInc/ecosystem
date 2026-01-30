import { parse } from 'tldts';

/**
 * Extracts the main domain from a hostname string using the Public Suffix List.
 * This handles complex TLDs and SLDs dynamically (e.g., .co.uk, .com.au, .gov.uk, etc.)
 * without needing manual maintenance of common SLD lists.
 *
 * @param hostname - The hostname string (e.g., "sub.example.com", "sub.example.co.uk")
 * @returns The main domain (e.g., "example.com", "example.co.uk")
 *
 * Examples:
 * - sub.example.com -> example.com
 * - sub.example.co.uk -> example.co.uk
 * - sub.example.com.au -> example.com.au
 * - sub.example.com.br -> example.com.br
 * - localhost -> localhost
 */
export function getMainDomain(hostname: string): string {
  if (!hostname) {
    return '';
  }

  // Remove protocol if present for cleaner parsing, though tldts handles it
  hostname = hostname.replace(/^[a-zA-Z]+:\/\//, '');
  
  const result = parse(hostname);
  
  if (result.domain) {
    return result.domain;
  }
  
  // Fallback for cases like localhost or simple hostnames not in PSL
  return hostname.split('/')[0].split('?')[0].split('#')[0];
}

