-- Performance indexes for URL mapping admin
-- Run these on your research database to optimize queries with 1M+ rows

-- =====================================================
-- INDEXES FOR scraping_results_staging_clone
-- =====================================================

-- Index for the landing_page ILIKE searches
-- Using pg_trgm extension for efficient ILIKE/LIKE pattern matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for fast ILIKE pattern matching on landing_page
-- This is crucial for the '%domain.com/path%' pattern matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_landing_page_trgm
ON public.scraping_results_staging_clone
USING gin (landing_page gin_trgm_ops);

-- Partial index for type = 'ai_response' rows only
-- This makes the filter much faster since we only care about ai_response rows
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_type_ai_response
ON public.scraping_results_staging_clone (type)
WHERE type = 'ai_response';

-- Composite index for the combined filter (landing_page pattern + type)
-- This helps when both conditions are used together
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_landing_type
ON public.scraping_results_staging_clone (type, landing_page);

-- Index on category for faster lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_category
ON public.scraping_results_staging_clone (category);

-- =====================================================
-- INDEXES FOR url_mappings_scraping_results
-- =====================================================

-- Index on cleaned_url for faster lookups (should already exist as UNIQUE)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_mappings_cleaned_url
-- ON url_mappings_scraping_results (cleaned_url);

-- Index on category for the categories dropdown
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mappings_category
ON url_mappings_scraping_results (category);

-- Index on created_at for sorting (ORDER BY created_at DESC)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mappings_created_at
ON url_mappings_scraping_results (created_at DESC);

-- =====================================================
-- ANALYZE TABLES
-- =====================================================

-- Update statistics for query planner
ANALYZE public.scraping_results_staging_clone;
ANALYZE url_mappings_scraping_results;

-- =====================================================
-- VERIFY INDEXES
-- =====================================================

-- Check if indexes were created
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('scraping_results_staging_clone', 'url_mappings_scraping_results')
ORDER BY tablename, indexname;
