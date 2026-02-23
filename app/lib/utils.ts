import React from 'react';

export function highlightMatch(text: string, query: string): React.ReactNode {
    if (!query || !text) return text || '';
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    if (parts.length === 1) return text;
    return parts.map((part, i) =>
        regex.test(part) ? React.createElement('mark', { key: i, className: 'search-highlight' }, part) : part
    );
}

/**
 * Clean/normalize a URL for consistent lookups
 * - Removes all query parameters (tracking params)
 * - Removes www prefix
 * - Removes trailing slashes
 * - Lowercases the host
*/
export function cleanUrl(url: string): string {
    try {
        const parsed = new URL(url);

        // Normalize host: remove www and lowercase
        let host = parsed.host.toLowerCase();
        if (host.startsWith('www.')) {
            host = host.substring(4);
        }

        // Remove trailing slash from pathname
        let pathname = parsed.pathname;
        if (pathname.length > 1 && pathname.endsWith('/')) {
            pathname = pathname.slice(0, -1);
        }

        // Rebuild URL without query params or hash
        return `${parsed.protocol}//${host}${pathname}`;
    } catch {
        // If URL is invalid, return as-is
        return url;
    }
}
