import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.RESEARCH_DB_HOST || 'localhost',
    port: parseInt(process.env.RESEARCH_DB_PORT || '5432'),
    database: process.env.RESEARCH_DB_NAME || 'research_db',
    user: process.env.RESEARCH_DB_USER || 'postgres',
    password: process.env.RESEARCH_DB_PASSWORD || '',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

export default pool;

export interface UrlMapping {
    id: number;
    cleaned_url: string;
    category: string;
    created_at: string;
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

export async function getAllMappings(
    search?: string,
    limit: number = 50,
    offset: number = 0
): Promise<{ mappings: UrlMapping[]; total: number }> {
    let query = 'SELECT * FROM url_mappings_scraping_results';
    let countQuery = 'SELECT COUNT(*) FROM url_mappings_scraping_results';
    const params: (string | number)[] = [];
    const countParams: string[] = [];

    if (search) {
        query += ' WHERE cleaned_url ILIKE $1 OR category ILIKE $1';
        countQuery += ' WHERE cleaned_url ILIKE $1 OR category ILIKE $1';
        params.push(`%${search}%`);
        countParams.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [result, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams),
    ]);

    return {
        mappings: result.rows,
        total: parseInt(countResult.rows[0].count),
    };
}

export async function getMappingById(id: number): Promise<UrlMapping | null> {
    const result = await pool.query(
        'SELECT * FROM url_mappings_scraping_results WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
}

export interface CreateMappingResult {
    mapping: UrlMapping;
    stagingRowsUpdated: number;
}

export async function createMapping(
    cleanedUrl: string,
    category: string
): Promise<CreateMappingResult> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Clean the URL before inserting
        const normalizedUrl = cleanUrl(cleanedUrl);

        console.log('\n========== CREATE MAPPING ==========');
        console.log('Input URL:', cleanedUrl);
        console.log('Normalized URL:', normalizedUrl);
        console.log('Category:', category);

        // Insert the new mapping
        const mappingResult = await client.query(
            `INSERT INTO url_mappings_scraping_results (cleaned_url, category)
             VALUES ($1, $2)
             RETURNING *`,
            [normalizedUrl, category]
        );

        // Build match pattern - the cleaned_url without query params should match the start of landing_page
        // Handle both with and without www, and http/https variations
        const baseUrl = normalizedUrl.replace(/^https?:\/\/(www\.)?/, '');
        const matchPattern = `%${baseUrl}%`;

        // First, find matching records to log them
        const previewQuery = `
            SELECT id, title, landing_page, category, type
            FROM public.scraping_results_staging_clone
            WHERE landing_page ILIKE $1
              AND type = 'ai_response'
            LIMIT 20`;

        console.log('\nBase URL for matching:', baseUrl);
        console.log('Match pattern:', matchPattern);
        console.log('\nPreview Query:');
        console.log(previewQuery.replace('$1', `'${matchPattern}'`));

        const previewResult = await client.query(previewQuery, [matchPattern]);
        console.log(`\nFound ${previewResult.rows.length} matching records (showing up to 20):`);
        previewResult.rows.forEach((row, i) => {
            console.log(`  ${i + 1}. ID: ${row.id}, Type: "${row.type}", Title: "${row.title?.substring(0, 50)}..."`);
            console.log(`     Current Category: "${row.category}"`);
            console.log(`     Landing Page: ${row.landing_page}`);
        });

        // Update all related records in scraping_results_staging_clone where type = 'ai-response'
        const updateQuery = `UPDATE public.scraping_results_staging_clone
             SET category = $1, updated_at = NOW()
             WHERE landing_page ILIKE $2
               AND type = 'ai_response'`;

        console.log('\nUpdate Query:');
        console.log(updateQuery.replace('$1', `'${category}'`).replace('$2', `'${matchPattern}'`));

        const stagingResult = await client.query(updateQuery, [category, matchPattern]);

        console.log(`\nRows updated: ${stagingResult.rowCount}`);
        console.log('=====================================\n');

        await client.query('COMMIT');

        return {
            mapping: mappingResult.rows[0],
            stagingRowsUpdated: stagingResult.rowCount ?? 0,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export interface UpdateMappingResult {
    mapping: UrlMapping | null;
    stagingRowsUpdated: number;
}

export async function updateMapping(
    id: number,
    category: string
): Promise<UpdateMappingResult> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // First, get the current mapping to get the cleaned_url
        const currentMapping = await client.query(
            'SELECT cleaned_url FROM url_mappings_scraping_results WHERE id = $1',
            [id]
        );

        if (currentMapping.rows.length === 0) {
            await client.query('ROLLBACK');
            return { mapping: null, stagingRowsUpdated: 0 };
        }

        const cleanedUrl = currentMapping.rows[0].cleaned_url;

        // Update the mapping
        const mappingResult = await client.query(
            `UPDATE url_mappings_scraping_results
             SET category = $1
             WHERE id = $2
             RETURNING *`,
            [category, id]
        );

        // Build match pattern - the cleaned_url without query params should match the start of landing_page
        // Handle both with and without www, and http/https variations
        const baseUrl = cleanedUrl.replace(/^https?:\/\/(www\.)?/, '');
        const matchPattern = `%${baseUrl}%`;

        // First, find matching records to log them
        const previewQuery = `
            SELECT id, title, landing_page, category, type
            FROM public.scraping_results_staging_clone
            WHERE landing_page ILIKE $1
              AND type = 'ai_response'
            LIMIT 20`;

        console.log('\n========== STAGING UPDATE PREVIEW ==========');
        console.log('Cleaned URL:', cleanedUrl);
        console.log('Base URL for matching:', baseUrl);
        console.log('Match pattern:', matchPattern);
        console.log('New category:', category);
        console.log('\nPreview Query:');
        console.log(previewQuery.replace('$1', `'${matchPattern}'`));

        const previewResult = await client.query(previewQuery, [matchPattern]);
        console.log(`\nFound ${previewResult.rows.length} matching records (showing up to 20):`);
        previewResult.rows.forEach((row, i) => {
            console.log(`  ${i + 1}. ID: ${row.id}, Type: "${row.type}", Title: "${row.title?.substring(0, 50)}..."`);
            console.log(`     Current Category: "${row.category}"`);
            console.log(`     Landing Page: ${row.landing_page}`);
        });

        // Update all related records in scraping_results_staging_clone where type = 'ai-response'
        const updateQuery = `UPDATE public.scraping_results_staging_clone
             SET category = $1, updated_at = NOW()
             WHERE landing_page ILIKE $2
               AND type = 'ai_response'`;

        console.log('\nUpdate Query:');
        console.log(updateQuery.replace('$1', `'${category}'`).replace('$2', `'${matchPattern}'`));

        const stagingResult = await client.query(updateQuery, [category, matchPattern]);

        console.log(`\nRows updated: ${stagingResult.rowCount}`);
        console.log('============================================\n');

        await client.query('COMMIT');

        return {
            mapping: mappingResult.rows[0] || null,
            stagingRowsUpdated: stagingResult.rowCount ?? 0,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function deleteMapping(id: number): Promise<boolean> {
    const result = await pool.query(
        'DELETE FROM url_mappings_scraping_results WHERE id = $1',
        [id]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function getCategories(): Promise<string[]> {
    const result = await pool.query(
        'SELECT DISTINCT category FROM url_mappings_scraping_results ORDER BY category'
    );
    return result.rows.map((row) => row.category);
}
