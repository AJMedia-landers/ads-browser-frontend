-- Current indexes for URL mapping admin tables
-- These indexes are already deployed on the research database

-- =====================================================
-- INDEXES FOR scraping_results_staging_clone
-- =====================================================

-- Composite index for the main ads query filter (country + date range)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_country_date
ON public.scraping_results_staging_clone (country, date);

-- Index on type column for the typeFilter dropdown (url_mapping / title_mapping / ai_response)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_type
ON public.scraping_results_staging_clone (type);

-- Index on category for faster lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_category
ON public.scraping_results_staging_clone (category);

-- Index on title for exact match joins with title_mappings and DISTINCT title queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_title
ON public.scraping_results_staging_clone (title);

-- =====================================================
-- INDEXES FOR url_mappings_scraping_results
-- =====================================================

-- cleaned_url already exists as UNIQUE constraint
-- id already exists as PRIMARY KEY

-- Index on category for the categories dropdown and search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_url_mappings_category
ON url_mappings_scraping_results (category);

-- =====================================================
-- INDEXES FOR title_mappings_scraping_results
-- =====================================================

-- title already exists as UNIQUE constraint (used for ON CONFLICT)
-- id already exists as PRIMARY KEY

-- Index on category for filtering, sorting, and the categories/all query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_title_mappings_category
ON title_mappings_scraping_results (category);

-- Index on created_at for sorting (ORDER BY created_at DESC)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_title_mappings_created_at
ON title_mappings_scraping_results (created_at DESC);

-- =====================================================
-- OPTIONAL: indexes that may improve performance
-- =====================================================

-- Composite index for type + landing_page (helps create/update mapping targeting ai_response rows)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_landing_type
-- ON public.scraping_results_staging_clone (type, landing_page);

-- Index on created_at for default sort order in URL mappings list
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mappings_created_at
-- ON url_mappings_scraping_results (created_at DESC);

-- GIN trgm indexes for fast ILIKE '%search%' pattern matching
-- These are slow to build on large tables — run during off-hours
-- Requires: CREATE EXTENSION IF NOT EXISTS pg_trgm;
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_landing_page_trgm
-- ON public.scraping_results_staging_clone USING gin (landing_page gin_trgm_ops);
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_title_trgm
-- ON public.scraping_results_staging_clone USING gin (title gin_trgm_ops);
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staging_category_trgm
-- ON public.scraping_results_staging_clone USING gin (category gin_trgm_ops);
