'use client';

import { CategoryWithCounts } from '@/app/lib/types';
import { highlightMatch } from '@/app/lib/utils';

interface CategoryListProps {
    categories: CategoryWithCounts[];
    loading: boolean;
    fetchError: string | null;
    selectedSourceCategories: Set<string>;
    onToggleCategory: (category: string) => void;
    categorySortColumn: 'category' | 'mapping_count' | 'ad_count' | 'title_mapping_count';
    categorySortDirection: 'asc' | 'desc';
    onSort: (column: 'category' | 'mapping_count' | 'ad_count' | 'title_mapping_count') => void;
    categorySearch: string;
    hasDateFilter: boolean;
}

export default function CategoryList({
    categories,
    loading,
    fetchError,
    selectedSourceCategories,
    onToggleCategory,
    categorySortColumn,
    categorySortDirection,
    onSort,
    categorySearch,
    hasDateFilter,
}: CategoryListProps) {
    return (
        <div className="dedup-list">
            <div className="dedup-list-header">
                <span className="sortable-header" onClick={() => onSort('category')}>
                    Category ({categories.length}) {categorySortColumn === 'category' && (categorySortDirection === 'asc' ? '\u2191' : '\u2193')}
                </span>
                <span className="sortable-header dedup-header-count" onClick={() => onSort('mapping_count')}>
                    URL Map {categorySortColumn === 'mapping_count' && (categorySortDirection === 'asc' ? '\u2191' : '\u2193')}
                </span>
                <span className="sortable-header dedup-header-count" onClick={() => onSort('title_mapping_count')}>
                    Title Map {categorySortColumn === 'title_mapping_count' && (categorySortDirection === 'asc' ? '\u2191' : '\u2193')}
                </span>
                <span className="sortable-header dedup-header-count" onClick={() => onSort('ad_count')}>
                    Ads{hasDateFilter ? ' (filtered)' : ''} {categorySortColumn === 'ad_count' && (categorySortDirection === 'asc' ? '\u2191' : '\u2193')}
                </span>
            </div>
            {loading ? (
                <div className="ads-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading categories...</p>
                </div>
            ) : categories.length === 0 ? (
                <div className="ads-empty">{fetchError || 'No categories found.'}</div>
            ) : (
                <div className="dedup-list-body">
                    {categories.map((cat) => (
                        <div
                            key={cat.category}
                            className={`dedup-row ${selectedSourceCategories.has(cat.category) ? 'selected' : ''}`}
                            onClick={() => onToggleCategory(cat.category)}
                        >
                            <span className="dedup-row-name">{highlightMatch(cat.category, categorySearch)}</span>
                            <span className="dedup-row-count">{cat.mapping_count}</span>
                            <span className="dedup-row-count">{cat.title_mapping_count}</span>
                            <span className="dedup-row-count">{cat.ad_count}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
