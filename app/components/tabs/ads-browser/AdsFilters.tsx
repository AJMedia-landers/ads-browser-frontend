'use client';

import { COUNTRIES } from '@/app/lib/constants';

interface AdsFiltersProps {
    // Primary filters
    selectedCountry: string;
    startDate: string;
    endDate: string;
    onCountryChange: (country: string) => void;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    // Secondary filters
    uniqueFilter: string;
    filterEmptyCategory: boolean;
    filterType: string;
    exporting: boolean;
    canExport: boolean;
    onUniqueFilterChange: (value: string) => void;
    onFilterEmptyCategoryChange: (checked: boolean) => void;
    onFilterTypeChange: (value: string) => void;
    onExport: () => void;
    // Search
    searchCategory: string;
    searchTitle: string;
    searchLandingPage: string;
    onSearchCategoryChange: (value: string) => void;
    onSearchTitleChange: (value: string) => void;
    onSearchLandingPageChange: (value: string) => void;
}

export default function AdsFilters({
    selectedCountry,
    startDate,
    endDate,
    onCountryChange,
    onStartDateChange,
    onEndDateChange,
    uniqueFilter,
    filterEmptyCategory,
    filterType,
    exporting,
    canExport,
    onUniqueFilterChange,
    onFilterEmptyCategoryChange,
    onFilterTypeChange,
    onExport,
    searchCategory,
    searchTitle,
    searchLandingPage,
    onSearchCategoryChange,
    onSearchTitleChange,
    onSearchLandingPageChange,
}: AdsFiltersProps) {
    return (
        <>
            <div className="filter-controls">
                <div className="filter-group">
                    <label htmlFor="country-select">Country</label>
                    <select
                        id="country-select"
                        value={selectedCountry}
                        onChange={(e) => onCountryChange(e.target.value)}
                    >
                        <option value="">Select a country</option>
                        {COUNTRIES.map((country) => (
                            <option key={country} value={country}>
                                {country}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="start-date">Start Date</label>
                    <input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => onStartDateChange(e.target.value)}
                        max={endDate || undefined}
                        disabled={!selectedCountry}
                    />
                </div>
                <div className="filter-group">
                    <label htmlFor="end-date">End Date</label>
                    <input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => onEndDateChange(e.target.value)}
                        min={startDate || undefined}
                        disabled={!selectedCountry}
                    />
                </div>
            </div>

            <div className="filter-controls">
                <div className="filter-checkboxes">
                    <select
                        value={uniqueFilter}
                        onChange={(e) => onUniqueFilterChange(e.target.value)}
                        style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '2px solid #e8e8e8', fontSize: '0.85rem' }}
                    >
                        <option value="none">No dedup</option>
                        <option value="uniqueUrls">Unique URLs</option>
                        <option value="uniqueCategoryUrl">Unique Category + URL</option>
                        <option value="uniqueTitleUrl">Unique Title + URL</option>
                    </select>
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={filterEmptyCategory}
                            onChange={(e) => onFilterEmptyCategoryChange(e.target.checked)}
                        />
                        Empty/unknown categories
                    </label>
                    <select
                        value={filterType}
                        onChange={(e) => onFilterTypeChange(e.target.value)}
                        style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '2px solid #e8e8e8', fontSize: '0.85rem' }}
                    >
                        <option value="">All types</option>
                        <option value="url_mapping">URL Mapping</option>
                        <option value="title_mapping">Title Mapping</option>
                        <option value="ai_response">AI Response</option>
                    </select>
                    <button
                        onClick={onExport}
                        disabled={exporting || !canExport}
                        className="action-btn save-btn"
                        style={{ fontSize: '0.85rem', padding: '0.3rem 0.7rem' }}
                    >
                        {exporting ? 'Exporting...' : 'Export to Excel'}
                    </button>
                </div>
            </div>

            <div className="search-controls">
                <div className="search-field">
                    <label htmlFor="search-category">Category</label>
                    <input
                        id="search-category"
                        type="text"
                        value={searchCategory}
                        onChange={(e) => onSearchCategoryChange(e.target.value)}
                        placeholder="Search category..."
                        list="categories"
                    />
                </div>
                <div className="search-field">
                    <label htmlFor="search-title">Title</label>
                    <input
                        id="search-title"
                        type="text"
                        value={searchTitle}
                        onChange={(e) => onSearchTitleChange(e.target.value)}
                        placeholder="Search title..."
                    />
                </div>
                <div className="search-field">
                    <label htmlFor="search-landing">Landing Page</label>
                    <input
                        id="search-landing"
                        type="text"
                        value={searchLandingPage}
                        onChange={(e) => onSearchLandingPageChange(e.target.value)}
                        placeholder="Search landing page..."
                    />
                </div>
            </div>
        </>
    );
}
