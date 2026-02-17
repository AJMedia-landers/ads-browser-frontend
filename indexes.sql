-- Performance indexes for URL mapping admin
-- Run these on your research database to optimize queries with 1M+ rows

-- =====================================================
-- EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- INDEXES FOR scraping_results_staging_clone
-- =====================================================

-- GIN index for fast ILIKE pattern matching on landing_page
-- Crucial for '%domain.com/path%' pattern matching in URL mapping lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_landing_page_trgm
ON public.scraping_results_staging_clone
USING gin (landing_page gin_trgm_ops);

-- Composite index for the main ads query filter (country + date range)
-- This is the most common query pattern in the ads browser
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_country_date
ON public.scraping_results_staging_clone (country, date);

-- Index on type column for the typeFilter dropdown (url_mapping / title_mapping / ai_response)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_type
ON public.scraping_results_staging_clone (type);

-- Composite index for the combined filter (landing_page pattern + type)
-- Helps when both conditions are used together (e.g. create/update mapping targeting ai_response rows)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_landing_type
ON public.scraping_results_staging_clone (type, landing_page);

-- Index on category for faster lookups and ILIKE search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_category
ON public.scraping_results_staging_clone (category);

-- Index on title for exact match joins with title_mappings (conflict check, DISTINCT title queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_title
ON public.scraping_results_staging_clone (title);

-- GIN index for ILIKE pattern matching on title (search by title filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_title_trgm
ON public.scraping_results_staging_clone
USING gin (title gin_trgm_ops);

-- GIN index for ILIKE pattern matching on category (search by category filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_category_trgm
ON public.scraping_results_staging_clone
USING gin (category gin_trgm_ops);

-- =====================================================
-- INDEXES FOR url_mappings_scraping_results
-- =====================================================

-- cleaned_url should already exist as UNIQUE constraint
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_mappings_cleaned_url
-- ON url_mappings_scraping_results (cleaned_url);

-- Index on category for the categories dropdown and ILIKE search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mappings_category
ON url_mappings_scraping_results (category);

-- Index on created_at for sorting (ORDER BY created_at DESC)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mappings_created_at
ON url_mappings_scraping_results (created_at DESC);

-- =====================================================
-- INDEXES FOR title_mappings_scraping_results
-- =====================================================

-- title should already exist as UNIQUE constraint (used for ON CONFLICT)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_title_mappings_title
-- ON title_mappings_scraping_results (title);

-- Index on category for filtering, sorting, and the categories/all query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_title_mappings_category
ON title_mappings_scraping_results (category);

-- Index on created_at for sorting (ORDER BY created_at DESC)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_title_mappings_created_at
ON title_mappings_scraping_results (created_at DESC);

-- =====================================================
-- ANALYZE TABLES
-- =====================================================

ANALYZE public.scraping_results_staging_clone;
ANALYZE url_mappings_scraping_results;
ANALYZE title_mappings_scraping_results;

-- =====================================================
-- VERIFY INDEXES
-- =====================================================

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'scraping_results_staging_clone',
    'url_mappings_scraping_results',
    'title_mappings_scraping_results'
)
ORDER BY tablename, indexname;
