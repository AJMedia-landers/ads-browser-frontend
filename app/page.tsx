'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    const firstRender = useRef(true);
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

function highlightMatch(text: string, query: string): React.ReactNode {
    if (!query || !text) return text || '';
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    if (parts.length === 1) return text;
    return parts.map((part, i) =>
        regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
    );
}

const COUNTRIES = ['AU', 'UK', 'USA'] as const;

/**
 * Clean/normalize a URL for consistent lookups
 * - Removes all query parameters (tracking params)
 * - Removes www prefix
 * - Removes trailing slashes
 * - Lowercases the host
 */
function cleanUrl(url: string): string {
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

interface UrlMapping {
    id: number;
    cleaned_url: string;
    category: string;
    created_at: string;
}

interface Ad {
    id: number;
    country: string;
    date: string;
    title: string;
    ad_image_url: string;
    cdn_url: string;
    landing_page: string;
    website: string;
    location: string;
    ad_network: string;
    device: string;
    occurrences: number;
    hour_of_day: number;
    category: string;
    image_hash: string;
    type: string;
    url_count: number;
    category_count: number;
    title_count: number;
}

function HomeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize state from URL params
    const tabParam = searchParams.get('tab');
    const initialTab: 'mappings' | 'ads' | 'categories' = tabParam === 'mappings' ? 'mappings' : tabParam === 'categories' ? 'categories' : 'ads';
    const initialCountry = searchParams.get('country') || '';
    const initialStartDate = searchParams.get('startDate') || '';
    const initialEndDate = searchParams.get('endDate') || '';
    const initialAdsPage = parseInt(searchParams.get('adsPage') || '0');
    const initialMappingsPage = parseInt(searchParams.get('mappingsPage') || '0');
    const initialMappingSearchUrl = searchParams.get('searchUrl') || '';
    const initialMappingSearchCategory = searchParams.get('searchCategory') || '';
    const initialMappingSortColumn = searchParams.get('mappingsSortCol') || 'created_at';
    const initialMappingSortDirection = (searchParams.get('mappingsSortDir') || 'desc') as 'asc' | 'desc';

    const [activeTab, setActiveTab] = useState<'mappings' | 'ads' | 'categories'>(initialTab);
    const [mappings, setMappings] = useState<UrlMapping[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [mappingSearchUrl, setMappingSearchUrl] = useState(initialMappingSearchUrl);
    const [mappingSearchCategory, setMappingSearchCategory] = useState(initialMappingSearchCategory);
    const debouncedMappingSearchUrl = useDebounce(mappingSearchUrl, 400);
    const debouncedMappingSearchCategory = useDebounce(mappingSearchCategory, 400);
    const [page, setPage] = useState(initialMappingsPage);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editCategory, setEditCategory] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [hoveredUrlId, setHoveredUrlId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [adding, setAdding] = useState(false);
    const [mappingSortColumn, setMappingSortColumn] = useState<string>(initialMappingSortColumn);
    const [mappingSortDirection, setMappingSortDirection] = useState<'asc' | 'desc'>(initialMappingSortDirection);
    const limit = 20;

    // Ads Browser state
    const [ads, setAds] = useState<Ad[]>([]);
    const [adsTotal, setAdsTotal] = useState(0);
    const [selectedCountry, setSelectedCountry] = useState(initialCountry);
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [adsPage, setAdsPage] = useState(initialAdsPage);
    const [loadingAds, setLoadingAds] = useState(false);
    const [editingAdId, setEditingAdId] = useState<number | null>(null);
    const [editAdCategory, setEditAdCategory] = useState('');
    const [savingAd, setSavingAd] = useState(false);
    const [filterUniqueUrls, setFilterUniqueUrls] = useState(false);
    const [filterEmptyCategory, setFilterEmptyCategory] = useState(false);
    const [filterAiMappingOnly, setFilterAiMappingOnly] = useState(false);
    const [searchCategory, setSearchCategory] = useState('');
    const [searchTitle, setSearchTitle] = useState('');
    const [searchLandingPage, setSearchLandingPage] = useState('');
    const debouncedSearchCategory = useDebounce(searchCategory, 400);
    const debouncedSearchTitle = useDebounce(searchTitle, 400);
    const debouncedSearchLandingPage = useDebounce(searchLandingPage, 400);
    const [sortColumn, setSortColumn] = useState<string>('id');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const adsLimit = 50;

    // Categories Dedup state
    interface CategoryWithCounts {
        category: string;
        mapping_count: number;
        ad_count: number;
    }
    const [allCategories, setAllCategories] = useState<CategoryWithCounts[]>([]);
    const [loadingAllCategories, setLoadingAllCategories] = useState(false);
    const [categorySearch, setCategorySearch] = useState('');
    const [selectedSourceCategory, setSelectedSourceCategory] = useState<string | null>(null);
    const [mergeTarget, setMergeTarget] = useState('');
    const [merging, setMerging] = useState(false);
    const [categorySortColumn, setCategorySortColumn] = useState<'category' | 'mapping_count' | 'ad_count'>('category');
    const [categorySortDirection, setCategorySortDirection] = useState<'asc' | 'desc'>('asc');
    const [catCountry, setCatCountry] = useState('');
    const [catStartDate, setCatStartDate] = useState('');
    const [catEndDate, setCatEndDate] = useState('');

    // Sync state to URL params
    useEffect(() => {
        const params = new URLSearchParams();
        if (activeTab === 'mappings') {
            params.set('tab', 'mappings');
            if (page > 0) params.set('mappingsPage', page.toString());
            if (debouncedMappingSearchUrl) params.set('searchUrl', debouncedMappingSearchUrl);
            if (debouncedMappingSearchCategory) params.set('searchCategory', debouncedMappingSearchCategory);
            if (mappingSortColumn !== 'created_at') params.set('mappingsSortCol', mappingSortColumn);
            if (mappingSortDirection !== 'desc') params.set('mappingsSortDir', mappingSortDirection);
        } else if (activeTab === 'categories') {
            params.set('tab', 'categories');
        } else {
            if (selectedCountry) params.set('country', selectedCountry);
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
            if (adsPage > 0) params.set('adsPage', adsPage.toString());
        }
        const newUrl = params.toString() ? `?${params.toString()}` : '/';
        router.replace(newUrl, { scroll: false });
    }, [activeTab, selectedCountry, startDate, endDate, adsPage, page, debouncedMappingSearchUrl, debouncedMappingSearchCategory, mappingSortColumn, mappingSortDirection, router]);

    const fetchMappings = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: (page * limit).toString(),
                sortColumn: mappingSortColumn,
                sortDirection: mappingSortDirection,
            });
            if (debouncedMappingSearchUrl) params.set('searchUrl', debouncedMappingSearchUrl);
            if (debouncedMappingSearchCategory) params.set('searchCategory', debouncedMappingSearchCategory);

            const res = await fetch(`/api/mappings?${params}`);
            const data = await res.json();
            setMappings(data.mappings);
            setTotal(data.total);
        } catch {
            setError('Failed to fetch mappings');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedMappingSearchUrl, debouncedMappingSearchCategory, mappingSortColumn, mappingSortDirection]);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            const data = await res.json();
            setCategories(Array.isArray(data) ? data : []);
        } catch {
            console.error('Failed to fetch categories');
        }
    };

    const fetchAds = useCallback(async (
        country: string, sDate: string, eDate: string, page: number,
        uniqueUrls: boolean, emptyCategory: boolean, aiMappingOnly: boolean,
        sCat: string, sTitle: string, sLanding: string,
        sortCol: string, sortDir: string
    ) => {
        if (!country || !sDate) {
            setAds([]);
            setAdsTotal(0);
            return;
        }
        setLoadingAds(true);
        try {
            const offset = page * adsLimit;
            const params = new URLSearchParams({
                country,
                date: sDate,
                limit: adsLimit.toString(),
                offset: offset.toString(),
                uniqueUrls: uniqueUrls.toString(),
                emptyCategory: emptyCategory.toString(),
                aiMappingOnly: aiMappingOnly.toString(),
                sortColumn: sortCol,
                sortDirection: sortDir,
            });
            if (eDate) params.set('endDate', eDate);
            if (sCat) params.set('searchCategory', sCat);
            if (sTitle) params.set('searchTitle', sTitle);
            if (sLanding) params.set('searchLandingPage', sLanding);
            const res = await fetch(`/api/ads?${params}`);
            const data = await res.json();
            setAds(data.ads || []);
            setAdsTotal(data.total || 0);
        } catch {
            setError('Failed to fetch ads');
            setAds([]);
            setAdsTotal(0);
        } finally {
            setLoadingAds(false);
        }
    }, [adsLimit]);

    const handleEditAd = (ad: Ad) => {
        setEditingAdId(ad.id);
        setEditAdCategory(ad.category || '');
    };

    const handleSaveAdCategory = async (ad: Ad) => {
        setSavingAd(true);
        setError('');
        try {
            const res = await fetch('/api/ads/category', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    landingPage: ad.landing_page,
                    category: editAdCategory,
                }),
            });

            if (!res.ok) throw new Error('Failed to update');

            const data = await res.json();
            setEditingAdId(null);
            const mappingMsg = data.mappingCreated ? 'URL mapping created. ' : 'URL mapping updated. ';
            setSuccess(`${mappingMsg}${data.rowsUpdated} ad records updated.`);
            setTimeout(() => setSuccess(''), 5000);

            // Update local state to reflect the change for all matching URLs
            // Use same cleaning logic as backend
            const cleanedUrl = cleanUrl(ad.landing_page);
            const baseUrl = cleanedUrl.replace(/^https?:\/\/(www\.)?/, '');
            setAds(prevAds => prevAds.map(a => {
                const aCleanedUrl = cleanUrl(a.landing_page);
                const aBaseUrl = aCleanedUrl.replace(/^https?:\/\/(www\.)?/, '');
                // Match if one contains the other (same ILIKE logic as backend)
                return aBaseUrl.includes(baseUrl) || baseUrl.includes(aBaseUrl)
                    ? { ...a, category: editAdCategory }
                    : a;
            }));
        } catch {
            setError('Failed to update category');
        } finally {
            setSavingAd(false);
        }
    };

    const handleCancelAdEdit = () => {
        setEditingAdId(null);
        setEditAdCategory('');
    };

    const handleMarkUninterested = (ad: Ad) => {
        setConfirmAction({
            message: `Mark this URL as uninterested? This will delete ALL ads with this landing page and it will never appear again.`,
            onConfirm: async () => {
                setConfirmAction(null);
                setSavingAd(true);
                setError('');
                try {
                    const res = await fetch('/api/ads/uninterested', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ landingPage: ad.landing_page }),
                    });

                    if (!res.ok) throw new Error('Failed to mark as uninterested');

                    const data = await res.json();
                    setSuccess(`Marked as uninterested. ${data.rowsDeleted} ad records deleted.`);
                    setTimeout(() => setSuccess(''), 5000);

                    const cleanedUrl = cleanUrl(ad.landing_page);
                    const baseUrl = cleanedUrl.replace(/^https?:\/\/(www\.)?/, '');
                    setAds(prevAds => prevAds.filter(a => {
                        const aCleanedUrl = cleanUrl(a.landing_page);
                        const aBaseUrl = aCleanedUrl.replace(/^https?:\/\/(www\.)?/, '');
                        return !(aBaseUrl.includes(baseUrl) || baseUrl.includes(aBaseUrl));
                    }));
                    setAdsTotal(prev => prev - data.rowsDeleted);
                } catch {
                    setError('Failed to mark as uninterested');
                } finally {
                    setSavingAd(false);
                }
            },
        });
    };

    useEffect(() => {
        fetchMappings();
    }, [fetchMappings]);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (selectedCountry && startDate) {
            fetchAds(selectedCountry, startDate, endDate, adsPage, filterUniqueUrls, filterEmptyCategory, filterAiMappingOnly, debouncedSearchCategory, debouncedSearchTitle, debouncedSearchLandingPage, sortColumn, sortDirection);
        }
    }, [selectedCountry, startDate, endDate, adsPage, filterUniqueUrls, filterEmptyCategory, filterAiMappingOnly, debouncedSearchCategory, debouncedSearchTitle, debouncedSearchLandingPage, sortColumn, sortDirection, fetchAds]);

    const handleMappingSort = (column: string) => {
        if (mappingSortColumn === column) {
            setMappingSortDirection(mappingSortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setMappingSortColumn(column);
            setMappingSortDirection('desc');
        }
        setPage(0);
    };

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
        setAdsPage(0);
    };

    const [refreshing, setRefreshing] = useState(false);

    const handleForceRefresh = async () => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/cache/clear', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to clear cache');
            setSuccess('Cache cleared. Refreshing data...');
            setTimeout(() => setSuccess(''), 3000);
            // Re-fetch current tab's data
            if (activeTab === 'mappings') {
                fetchMappings();
            } else if (activeTab === 'categories') {
                fetchAllCategories(catCountry, catStartDate, catEndDate);
            } else if (selectedCountry && startDate) {
                fetchAds(selectedCountry, startDate, endDate, adsPage, filterUniqueUrls, filterEmptyCategory, filterAiMappingOnly, debouncedSearchCategory, debouncedSearchTitle, debouncedSearchLandingPage, sortColumn, sortDirection);
            }
            fetchCategories();
        } catch {
            setError('Failed to clear cache');
        } finally {
            setRefreshing(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    const handleEdit = (mapping: UrlMapping) => {
        setEditingId(mapping.id);
        setEditCategory(mapping.category);
    };

    const handleSaveEdit = async (id: number) => {
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`/api/mappings/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: editCategory }),
            });

            if (!res.ok) throw new Error('Failed to update');

            const data = await res.json();
            setEditingId(null);
            setSuccess(`Mapping updated. ${data.stagingRowsUpdated} ad records updated.`);
            setTimeout(() => setSuccess(''), 5000);
            fetchMappings();
            fetchCategories();
        } catch {
            setError('Failed to update mapping');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: number) => {
        setConfirmAction({
            message: 'Are you sure you want to delete this mapping?',
            onConfirm: async () => {
                setConfirmAction(null);
                setDeleting(id);
                setError('');
                try {
                    const res = await fetch(`/api/mappings/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete');
                    setSuccess('Mapping deleted.');
                    setTimeout(() => setSuccess(''), 3000);
                    fetchMappings();
                    fetchCategories();
                } catch {
                    setError('Failed to delete mapping');
                } finally {
                    setDeleting(null);
                }
            },
        });
    };

    const handleMarkMappingUninterested = (mapping: UrlMapping) => {
        setConfirmAction({
            message: `Mark this URL as uninterested? This will delete ALL ads with this landing page and update the category to "Manual Uninterested".`,
            onConfirm: async () => {
                setConfirmAction(null);
                setSaving(true);
                setError('');
                try {
                    const res = await fetch('/api/ads/uninterested', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ landingPage: mapping.cleaned_url }),
                    });

                    if (!res.ok) throw new Error('Failed to mark as uninterested');

                    const data = await res.json();
                    setSuccess(`Marked as uninterested. ${data.rowsDeleted} ad records deleted.`);
                    setTimeout(() => setSuccess(''), 5000);
                    fetchMappings();
                } catch {
                    setError('Failed to mark as uninterested');
                } finally {
                    setSaving(false);
                }
            },
        });
    };

    const fetchAllCategories = useCallback(async (country?: string, sDate?: string, eDate?: string) => {
        setLoadingAllCategories(true);
        try {
            const params = new URLSearchParams();
            if (country) params.set('country', country);
            if (sDate) params.set('startDate', sDate);
            if (eDate) params.set('endDate', eDate);
            const qs = params.toString();
            const res = await fetch(`/api/categories/all${qs ? `?${qs}` : ''}`);
            const data = await res.json();
            setAllCategories(Array.isArray(data) ? data : []);
        } catch {
            setError('Failed to fetch categories');
        } finally {
            setLoadingAllCategories(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'categories') {
            fetchAllCategories(catCountry, catStartDate, catEndDate);
        }
    }, [activeTab, catCountry, catStartDate, catEndDate, fetchAllCategories]);

    const handleMergeCategory = () => {
        if (!selectedSourceCategory || !mergeTarget.trim()) return;
        if (selectedSourceCategory === mergeTarget.trim()) {
            setError('Source and target categories must be different');
            return;
        }
        setConfirmAction({
            message: `Merge "${selectedSourceCategory}" into "${mergeTarget.trim()}"? All records will be updated to use the target category name.`,
            onConfirm: async () => {
                setConfirmAction(null);
                setMerging(true);
                setError('');
                try {
                    const res = await fetch('/api/categories/rename', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            oldCategory: selectedSourceCategory,
                            newCategory: mergeTarget.trim(),
                        }),
                    });

                    if (!res.ok) throw new Error('Failed to merge');

                    const data = await res.json();
                    setSuccess(`Merged! ${data.mappingsUpdated} mappings and ${data.adsUpdated} ads updated.`);
                    setTimeout(() => setSuccess(''), 5000);
                    setSelectedSourceCategory(null);
                    setMergeTarget('');
                    fetchAllCategories(catCountry, catStartDate, catEndDate);
                    fetchCategories();
                } catch {
                    setError('Failed to merge categories');
                } finally {
                    setMerging(false);
                }
            },
        });
    };

    const handleCategorySort = (column: 'category' | 'mapping_count' | 'ad_count') => {
        if (categorySortColumn === column) {
            setCategorySortDirection(categorySortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setCategorySortColumn(column);
            setCategorySortDirection(column === 'category' ? 'asc' : 'desc');
        }
    };

    const filteredAllCategories = allCategories
        .filter((c) => c.category.toLowerCase().includes(categorySearch.toLowerCase()))
        .sort((a, b) => {
            const dir = categorySortDirection === 'asc' ? 1 : -1;
            if (categorySortColumn === 'category') {
                return dir * a.category.localeCompare(b.category);
            }
            return dir * (a[categorySortColumn] - b[categorySortColumn]);
        });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setAdding(true);

        try {
            const res = await fetch('/api/mappings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cleaned_url: newUrl,
                    category: newCategory,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create');
            }

            setShowAddModal(false);
            setNewUrl('');
            setNewCategory('');
            setSuccess(`Mapping created. ${data.stagingRowsUpdated} ad records updated.`);
            setTimeout(() => setSuccess(''), 5000);
            fetchMappings();
            fetchCategories();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create mapping');
        } finally {
            setAdding(false);
        }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="app-container">
            <nav className="app-nav">
                <div className="nav-inner">
                    <div className="nav-tabs">
                        <button
                            className={`nav-tab ${activeTab === 'ads' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ads')}
                        >
                            Ads Browser
                        </button>
                        <button
                            className={`nav-tab ${activeTab === 'mappings' ? 'active' : ''}`}
                            onClick={() => setActiveTab('mappings')}
                        >
                            URL Mappings
                        </button>
                        <button
                            className={`nav-tab ${activeTab === 'categories' ? 'active' : ''}`}
                            onClick={() => setActiveTab('categories')}
                        >
                            Categories
                        </button>
                    </div>
                    <div className="nav-actions">
                        <button
                            className="logout-btn"
                            onClick={handleForceRefresh}
                            disabled={refreshing}
                            title="Clear server cache and reload data"
                        >
                            {refreshing ? 'Reloading...' : 'Reload Data'}
                        </button>
                        <button className="logout-btn" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <main className="app-content">
                <div className="admin-container">
                    {error && (
                        <div className="alert alert-error">
                            {error}
                            <button onClick={() => setError('')} className="close-btn">
                                &times;
                            </button>
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success">
                            {success}
                            <button onClick={() => setSuccess('')} className="close-btn">
                                &times;
                            </button>
                        </div>
                    )}

                    {activeTab === 'categories' ? (
                        <>
                            <div className="admin-header">
                                <h1>Category Deduplication</h1>
                            </div>

                            <div className="filter-controls">
                                <div className="filter-group">
                                    <label htmlFor="cat-country-select">Country</label>
                                    <select
                                        id="cat-country-select"
                                        value={catCountry}
                                        onChange={(e) => setCatCountry(e.target.value)}
                                    >
                                        <option value="">All countries</option>
                                        {COUNTRIES.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label htmlFor="cat-start-date">Start Date</label>
                                    <input
                                        id="cat-start-date"
                                        type="date"
                                        value={catStartDate}
                                        onChange={(e) => setCatStartDate(e.target.value)}
                                        max={catEndDate || undefined}
                                    />
                                </div>
                                <div className="filter-group">
                                    <label htmlFor="cat-end-date">End Date</label>
                                    <input
                                        id="cat-end-date"
                                        type="date"
                                        value={catEndDate}
                                        onChange={(e) => setCatEndDate(e.target.value)}
                                        min={catStartDate || undefined}
                                    />
                                </div>
                            </div>

                            <div className="search-controls">
                                <div className="search-field">
                                    <label htmlFor="category-search">Search categories</label>
                                    <input
                                        id="category-search"
                                        type="text"
                                        value={categorySearch}
                                        onChange={(e) => setCategorySearch(e.target.value)}
                                        placeholder="Filter categories..."
                                    />
                                </div>
                            </div>

                            <div className="dedup-layout">
                                <div className="dedup-list">
                                    <div className="dedup-list-header">
                                        <span className="sortable-header" onClick={() => handleCategorySort('category')}>
                                            Category ({filteredAllCategories.length}) {categorySortColumn === 'category' && (categorySortDirection === 'asc' ? '↑' : '↓')}
                                        </span>
                                        <span className="sortable-header dedup-header-count" onClick={() => handleCategorySort('mapping_count')}>
                                            Mappings {categorySortColumn === 'mapping_count' && (categorySortDirection === 'asc' ? '↑' : '↓')}
                                        </span>
                                        <span className="sortable-header dedup-header-count" onClick={() => handleCategorySort('ad_count')}>
                                            Ads{catCountry || catStartDate || catEndDate ? ' (filtered)' : ''} {categorySortColumn === 'ad_count' && (categorySortDirection === 'asc' ? '↑' : '↓')}
                                        </span>
                                    </div>
                                    {loadingAllCategories ? (
                                        <div className="ads-loading">
                                            <div className="loading-spinner"></div>
                                            <p>Loading categories...</p>
                                        </div>
                                    ) : filteredAllCategories.length === 0 ? (
                                        <div className="ads-empty">No categories found.</div>
                                    ) : (
                                        <div className="dedup-list-body">
                                            {filteredAllCategories.map((cat) => (
                                                <div
                                                    key={cat.category}
                                                    className={`dedup-row ${selectedSourceCategory === cat.category ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        setSelectedSourceCategory(
                                                            selectedSourceCategory === cat.category ? null : cat.category
                                                        );
                                                        setMergeTarget('');
                                                    }}
                                                >
                                                    <span className="dedup-row-name">{highlightMatch(cat.category, categorySearch)}</span>
                                                    <span className="dedup-row-count">{cat.mapping_count}</span>
                                                    <span className="dedup-row-count">{cat.ad_count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="dedup-merge-panel">
                                    {selectedSourceCategory ? (
                                        <>
                                            <h3>Merge Category</h3>
                                            <div className="dedup-merge-source">
                                                <label>Source (will be renamed)</label>
                                                <div className="dedup-source-value">{selectedSourceCategory}</div>
                                            </div>
                                            <div className="dedup-merge-target">
                                                <label htmlFor="merge-target">Target (new name)</label>
                                                <input
                                                    id="merge-target"
                                                    type="text"
                                                    value={mergeTarget}
                                                    onChange={(e) => setMergeTarget(e.target.value)}
                                                    placeholder="Type or select target category..."
                                                    list="all-categories-list"
                                                />
                                            </div>
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleMergeCategory}
                                                disabled={!mergeTarget.trim() || merging}
                                            >
                                                {merging ? 'Merging...' : 'Merge'}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="dedup-merge-empty">
                                            Select a category from the list to merge it into another.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <datalist id="all-categories-list">
                                {allCategories.map((cat) => (
                                    <option key={cat.category} value={cat.category} />
                                ))}
                            </datalist>
                        </>
                    ) : activeTab === 'mappings' ? (
                        <>
                            <div className="admin-header">
                                <h1>URL Mapping Admin</h1>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="btn btn-primary"
                                >
                                    Add Mapping
                                </button>
                            </div>

                            <div className="search-controls">
                                <div className="search-field">
                                    <label htmlFor="mapping-search-url">URL</label>
                                    <input
                                        id="mapping-search-url"
                                        type="text"
                                        value={mappingSearchUrl}
                                        onChange={(e) => { setMappingSearchUrl(e.target.value); setPage(0); }}
                                        placeholder="Search by URL..."
                                    />
                                </div>
                                <div className="search-field">
                                    <label htmlFor="mapping-search-category">Category</label>
                                    <input
                                        id="mapping-search-category"
                                        type="text"
                                        value={mappingSearchCategory}
                                        onChange={(e) => { setMappingSearchCategory(e.target.value); setPage(0); }}
                                        placeholder="Search by category..."
                                        list="categories"
                                    />
                                </div>
                            </div>

                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th className="sortable-header" onClick={() => handleMappingSort('id')}>
                                                ID {mappingSortColumn === 'id' && (mappingSortDirection === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="sortable-header" onClick={() => handleMappingSort('cleaned_url')}>
                                                Cleaned URL {mappingSortColumn === 'cleaned_url' && (mappingSortDirection === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="sortable-header" onClick={() => handleMappingSort('category')}>
                                                Category {mappingSortColumn === 'category' && (mappingSortDirection === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="sortable-header" onClick={() => handleMappingSort('created_at')}>
                                                Created {mappingSortColumn === 'created_at' && (mappingSortDirection === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={5} className="empty-cell">
                                                    Loading...
                                                </td>
                                            </tr>
                                        ) : mappings.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="empty-cell">
                                                    No mappings found
                                                </td>
                                            </tr>
                                        ) : (
                                            mappings.map((mapping) => (
                                                <tr key={mapping.id}>
                                                    <td className="id-cell">{mapping.id}</td>
                                                    <td
                                                        className="url-cell"
                                                        onMouseEnter={() => setHoveredUrlId(mapping.id)}
                                                        onMouseLeave={() => setHoveredUrlId(null)}
                                                    >
                                                        <div className={`url-wrapper ${hoveredUrlId === mapping.id ? 'expanded' : ''}`}>
                                                            <a
                                                                href={mapping.cleaned_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="url-link"
                                                                title={mapping.cleaned_url}
                                                            >
                                                                {highlightMatch(mapping.cleaned_url, debouncedMappingSearchUrl)}
                                                            </a>
                                                            <button
                                                                className="open-url-btn"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    window.open(mapping.cleaned_url, '_blank');
                                                                }}
                                                                title="Open URL in new tab"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                                    <polyline points="15,3 21,3 21,9" />
                                                                    <line x1="10" y1="14" x2="21" y2="3" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="category-cell">
                                                        {editingId === mapping.id ? (
                                                            <input
                                                                type="text"
                                                                value={editCategory}
                                                                onChange={(e) => setEditCategory(e.target.value)}
                                                                className="edit-input"
                                                                list="categories"
                                                            />
                                                        ) : (
                                                            <span className="category-badge">
                                                                {highlightMatch(mapping.category, debouncedMappingSearchCategory)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="date-cell">
                                                        {new Date(mapping.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="actions-cell">
                                                        {editingId === mapping.id ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleSaveEdit(mapping.id)}
                                                                    className="action-btn save-btn"
                                                                    disabled={saving}
                                                                >
                                                                    {saving ? 'Saving...' : 'Save'}
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="action-btn cancel-btn"
                                                                    disabled={saving}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => handleEdit(mapping)}
                                                                    className="action-btn edit-btn"
                                                                    disabled={deleting === mapping.id}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(mapping.id)}
                                                                    className="action-btn delete-btn"
                                                                    disabled={deleting === mapping.id}
                                                                >
                                                                    {deleting === mapping.id ? 'Deleting...' : 'Delete'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleMarkMappingUninterested(mapping)}
                                                                    className="action-btn uninterested-action-btn"
                                                                    disabled={deleting === mapping.id}
                                                                >
                                                                    Uninterested
                                                                </button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>

                                <div className="pagination">
                                    <div className="pagination-info">
                                        Showing {total === 0 ? 0 : page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} results
                                    </div>
                                    <div className="pagination-controls">
                                        <button
                                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                                            disabled={page === 0}
                                            className="pagination-btn"
                                        >
                                            Previous
                                        </button>
                                        <span className="pagination-page">
                                            Page {page + 1} of {totalPages || 1}
                                        </span>
                                        <button
                                            onClick={() => setPage((p) => p + 1)}
                                            disabled={page >= totalPages - 1}
                                            className="pagination-btn"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {showAddModal && (
                                <div className="modal-overlay">
                                    <div className="modal">
                                        <div className="modal-header">
                                            <h2>Add New Mapping</h2>
                                            <button
                                                className="close-icon"
                                                onClick={() => {
                                                    setShowAddModal(false);
                                                    setNewUrl('');
                                                    setNewCategory('');
                                                }}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                        <form onSubmit={handleAdd} className="modal-form">
                                            <div className="form-group">
                                                <label htmlFor="newUrl">Cleaned URL</label>
                                                <input
                                                    id="newUrl"
                                                    type="text"
                                                    value={newUrl}
                                                    onChange={(e) => setNewUrl(e.target.value)}
                                                    required
                                                    placeholder="https://example.com/page"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="newCategory">Category</label>
                                                <input
                                                    id="newCategory"
                                                    type="text"
                                                    value={newCategory}
                                                    onChange={(e) => setNewCategory(e.target.value)}
                                                    required
                                                    placeholder="Enter or select a category"
                                                    list="categories"
                                                />
                                            </div>
                                            <div className="modal-actions">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowAddModal(false);
                                                        setNewUrl('');
                                                        setNewCategory('');
                                                    }}
                                                    className="btn btn-secondary"
                                                    disabled={adding}
                                                >
                                                    Cancel
                                                </button>
                                                <button type="submit" className="btn btn-primary" disabled={adding}>
                                                    {adding ? 'Adding...' : 'Add Mapping'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="admin-header">
                                <h1>Ads Browser</h1>
                            </div>

                            <div className="filter-controls">
                                <div className="filter-group">
                                    <label htmlFor="country-select">Country</label>
                                    <select
                                        id="country-select"
                                        value={selectedCountry}
                                        onChange={(e) => {
                                            setSelectedCountry(e.target.value);
                                            setStartDate('');
                                            setEndDate('');
                                            setAdsPage(0);
                                            setAds([]);
                                        }}
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
                                        onChange={(e) => {
                                            setStartDate(e.target.value);
                                            setAdsPage(0);
                                        }}
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
                                        onChange={(e) => {
                                            setEndDate(e.target.value);
                                            setAdsPage(0);
                                        }}
                                        min={startDate || undefined}
                                        disabled={!selectedCountry}
                                    />
                                </div>

                                <div className="filter-checkboxes">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={filterUniqueUrls}
                                            onChange={(e) => {
                                                setFilterUniqueUrls(e.target.checked);
                                                setAdsPage(0);
                                            }}
                                        />
                                        Unique landing pages
                                    </label>
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={filterEmptyCategory}
                                            onChange={(e) => {
                                                setFilterEmptyCategory(e.target.checked);
                                                setAdsPage(0);
                                            }}
                                        />
                                        Empty/unknown categories
                                    </label>
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={filterAiMappingOnly}
                                            onChange={(e) => {
                                                setFilterAiMappingOnly(e.target.checked);
                                                setAdsPage(0);
                                            }}
                                        />
                                        AI mapping only
                                    </label>
                                </div>
                            </div>

                            <div className="search-controls">
                                <div className="search-field">
                                    <label htmlFor="search-category">Category</label>
                                    <input
                                        id="search-category"
                                        type="text"
                                        value={searchCategory}
                                        onChange={(e) => { setSearchCategory(e.target.value); setAdsPage(0); }}
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
                                        onChange={(e) => { setSearchTitle(e.target.value); setAdsPage(0); }}
                                        placeholder="Search title..."
                                    />
                                </div>
                                <div className="search-field">
                                    <label htmlFor="search-landing">Landing Page</label>
                                    <input
                                        id="search-landing"
                                        type="text"
                                        value={searchLandingPage}
                                        onChange={(e) => { setSearchLandingPage(e.target.value); setAdsPage(0); }}
                                        placeholder="Search landing page..."
                                    />
                                </div>
                            </div>

                            {loadingAds ? (
                                <div className="ads-loading">
                                    <div className="loading-spinner"></div>
                                    <p>Loading ads...</p>
                                </div>
                            ) : ads.length > 0 ? (
                                <>
                                    <div className="table-container">
                                        <table className="data-table ads-table">
                                            <thead>
                                                <tr>
                                                    <th className="sortable-header" onClick={() => handleSort('category')}>
                                                        Category {sortColumn === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="sortable-header" onClick={() => handleSort('title')}>
                                                        Title {sortColumn === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th>Image</th>
                                                    <th className="sortable-header" onClick={() => handleSort('landing_page')}>
                                                        Landing Page {sortColumn === 'landing_page' && (sortDirection === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ads.map((ad) => (
                                                    <tr key={ad.id}>
                                                        <td className="ads-category-cell">
                                                            {editingAdId === ad.id ? (
                                                                <div className="ads-category-edit">
                                                                    <input
                                                                        type="text"
                                                                        value={editAdCategory}
                                                                        onChange={(e) => setEditAdCategory(e.target.value)}
                                                                        className="edit-input"
                                                                        list="categories"
                                                                        autoFocus
                                                                    />
                                                                    <div className="ads-edit-actions">
                                                                        <button
                                                                            onClick={() => handleSaveAdCategory(ad)}
                                                                            className="action-btn save-btn"
                                                                            disabled={savingAd}
                                                                        >
                                                                            {savingAd ? '...' : 'Save'}
                                                                        </button>
                                                                        <button
                                                                            onClick={handleCancelAdEdit}
                                                                            className="action-btn cancel-btn"
                                                                            disabled={savingAd}
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="ads-category-display">
                                                                    <span
                                                                        className="category-badge editable"
                                                                        onClick={() => handleEditAd(ad)}
                                                                        title="Click to edit category"
                                                                    >
                                                                        {highlightMatch(ad.category || 'Uncategorized', debouncedSearchCategory)}
                                                                    </span>
                                                                    <div className="ads-type-row">
                                                                        {ad.type && (
                                                                            <span className="type-tag">{ad.type}</span>
                                                                        )}
                                                                        <button
                                                                            className="uninterested-btn"
                                                                            onClick={() => handleMarkUninterested(ad)}
                                                                        >
                                                                            Uninterested
                                                                        </button>
                                                                    </div>
                                                                    {ad.category_count > 1 && (
                                                                        <span className="count-tag">{ad.category_count} ads in this category</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="ads-title-cell">
                                                            <div>{highlightMatch(ad.title || 'Untitled', debouncedSearchTitle)}</div>
                                                            {ad.title_count > 1 && (
                                                                <span className="count-tag">{ad.title_count} ads with this title</span>
                                                            )}
                                                        </td>
                                                        <td className="ads-image-cell">
                                                            {ad.cdn_url || ad.ad_image_url ? (
                                                                <a
                                                                    href={ad.cdn_url || ad.ad_image_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="ads-image-link"
                                                                >
                                                                    <img
                                                                        src={ad.cdn_url || ad.ad_image_url}
                                                                        alt={ad.title || 'Ad image'}
                                                                        className="ads-thumbnail"
                                                                        loading="lazy"
                                                                        onError={(e) => {
                                                                            const target = e.target as HTMLImageElement;
                                                                            target.style.display = 'none';
                                                                            target.nextElementSibling?.classList.remove('hidden');
                                                                        }}
                                                                    />
                                                                    <span className="ads-image-fallback hidden">View Image</span>
                                                                </a>
                                                            ) : (
                                                                <span className="no-image">No image</span>
                                                            )}
                                                        </td>
                                                        <td className="ads-url-cell">
                                                            <a
                                                                href={ad.landing_page}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="url-link"
                                                                title={ad.landing_page}
                                                            >
                                                                {highlightMatch(ad.landing_page, debouncedSearchLandingPage)}
                                                            </a>
                                                            {ad.url_count > 1 && (
                                                                <span className="count-tag">{ad.url_count} ads with this URL</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        <div className="pagination">
                                            <div className="pagination-info">
                                                Showing {adsTotal === 0 ? 0 : adsPage * adsLimit + 1} to {Math.min((adsPage + 1) * adsLimit, adsTotal)} of {adsTotal} ads
                                            </div>
                                            <div className="pagination-controls">
                                                <button
                                                    onClick={() => setAdsPage((p) => Math.max(0, p - 1))}
                                                    disabled={adsPage === 0}
                                                    className="pagination-btn"
                                                >
                                                    Previous
                                                </button>
                                                <span className="pagination-page">
                                                    Page {adsPage + 1} of {Math.ceil(adsTotal / adsLimit) || 1}
                                                </span>
                                                <button
                                                    onClick={() => setAdsPage((p) => p + 1)}
                                                    disabled={adsPage >= Math.ceil(adsTotal / adsLimit) - 1}
                                                    className="pagination-btn"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : selectedCountry && startDate ? (
                                <div className="ads-empty">
                                    No ads found for the selected country and date range.
                                </div>
                            ) : (
                                <div className="ads-empty">
                                    Select a country and a start date to browse ads.
                                </div>
                            )}
                        </>
                    )}

                    <datalist id="categories">
                        {categories.map((cat) => (
                            <option key={cat} value={cat} />
                        ))}
                    </datalist>
                </div>
            </main>

            {/* Confirm modal */}
            {confirmAction && (
                <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <p className="confirm-message">{confirmAction.message}</p>
                        <div className="confirm-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setConfirmAction(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={confirmAction.onConfirm}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading overlay */}
            {(saving || adding || savingAd || merging) && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>{saving ? 'Updating records...' : adding ? 'Creating mapping...' : merging ? 'Merging categories...' : 'Updating ad category...'}</p>
                </div>
            )}
        </div>
    );
}

export default function Home() {
    return (
        <Suspense fallback={
            <div className="app-container">
                <div className="ads-loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        }>
            <HomeContent />
        </Suspense>
    );
}
