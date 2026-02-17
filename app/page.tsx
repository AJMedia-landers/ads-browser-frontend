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

interface TitleMapping {
    id: number;
    title: string;
    category: string;
    translated_title: string;
    created_at: string;
    updated_at: string;
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
    cleaned_landing_page: string;
}

function HomeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize state from URL params
    const tabParam = searchParams.get('tab');
    const initialTab: 'mappings' | 'ads' | 'categories' | 'titles' = tabParam === 'mappings' ? 'mappings' : tabParam === 'categories' ? 'categories' : tabParam === 'titles' ? 'titles' : 'ads';
    const initialCountry = searchParams.get('country') || '';
    const initialStartDate = searchParams.get('startDate') || '';
    const initialEndDate = searchParams.get('endDate') || '';
    const initialAdsPage = parseInt(searchParams.get('adsPage') || '0');
    const initialMappingsPage = parseInt(searchParams.get('mappingsPage') || '0');
    const initialMappingSearchUrl = searchParams.get('searchUrl') || '';
    const initialMappingSearchCategory = searchParams.get('searchCategory') || '';
    const initialMappingSortColumn = searchParams.get('mappingsSortCol') || 'created_at';
    const initialMappingSortDirection = (searchParams.get('mappingsSortDir') || 'desc') as 'asc' | 'desc';

    const [activeTab, setActiveTab] = useState<'mappings' | 'ads' | 'categories' | 'titles'>(initialTab);
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
    const [fetchError, setFetchError] = useState<string | null>(null);
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
    const [uniqueFilter, setUniqueFilter] = useState('none');
    const [filterEmptyCategory, setFilterEmptyCategory] = useState(false);
    const [filterType, setFilterType] = useState('');
    const [searchCategory, setSearchCategory] = useState('');
    const [searchTitle, setSearchTitle] = useState('');
    const [searchLandingPage, setSearchLandingPage] = useState('');
    const debouncedSearchCategory = useDebounce(searchCategory, 400);
    const debouncedSearchTitle = useDebounce(searchTitle, 400);
    const debouncedSearchLandingPage = useDebounce(searchLandingPage, 400);
    const [sortColumn, setSortColumn] = useState<string>('occurrences');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [exporting, setExporting] = useState(false);
    const adsLimit = 50;

    // Categories Dedup state
    interface CategoryWithCounts {
        category: string;
        mapping_count: number;
        ad_count: number;
        title_mapping_count: number;
    }
    const [allCategories, setAllCategories] = useState<CategoryWithCounts[]>([]);
    const [loadingAllCategories, setLoadingAllCategories] = useState(false);
    const [categorySearch, setCategorySearch] = useState('');
    const [selectedSourceCategories, setSelectedSourceCategories] = useState<Set<string>>(new Set());
    const [mergeTarget, setMergeTarget] = useState('');
    const [merging, setMerging] = useState(false);
    const [normalising, setNormalising] = useState(false);
    const [categorySortColumn, setCategorySortColumn] = useState<'category' | 'mapping_count' | 'ad_count' | 'title_mapping_count'>('category');
    const [categorySortDirection, setCategorySortDirection] = useState<'asc' | 'desc'>('asc');
    const [catCountry, setCatCountry] = useState('');
    const [catStartDate, setCatStartDate] = useState('');
    const [catEndDate, setCatEndDate] = useState('');
    // Title Mappings state
    const [titleMappings, setTitleMappings] = useState<TitleMapping[]>([]);
    const [titleMappingsTotal, setTitleMappingsTotal] = useState(0);
    const [titleMappingsPage, setTitleMappingsPage] = useState(0);
    const [titleMappingsLoading, setTitleMappingsLoading] = useState(false);
    const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
    const [editTitleCategory, setEditTitleCategory] = useState('');
    const [titleSearchTitle, setTitleSearchTitle] = useState('');
    const [titleSearchCategory, setTitleSearchCategory] = useState('');
    const debouncedTitleSearchTitle = useDebounce(titleSearchTitle, 400);
    const debouncedTitleSearchCategory = useDebounce(titleSearchCategory, 400);
    const [titleSortColumn, setTitleSortColumn] = useState<string>('created_at');
    const [titleSortDirection, setTitleSortDirection] = useState<'asc' | 'desc'>('desc');
    const [showAddTitleModal, setShowAddTitleModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newTitleCategory, setNewTitleCategory] = useState('');
    const [savingTitle, setSavingTitle] = useState(false);
    const [deletingTitle, setDeletingTitle] = useState<number | null>(null);
    const [addingTitle, setAddingTitle] = useState(false);
    const titleLimit = 20;
    const [infoModal, setInfoModal] = useState<string | null>(null);

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
        } else if (activeTab === 'titles') {
            params.set('tab', 'titles');
            if (titleMappingsPage > 0) params.set('titlesPage', titleMappingsPage.toString());
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
            if (res.status === 401) { setFetchError('Session expired — please log in again.'); setMappings([]); setTotal(0); return; }
            if (!res.ok) { setFetchError(`Server error (${res.status}) — could not load mappings.`); setMappings([]); setTotal(0); return; }
            setFetchError(null);
            const data = await res.json();
            setMappings(data.mappings);
            setTotal(data.total);
        } catch {
            setFetchError('Could not connect to server — check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedMappingSearchUrl, debouncedMappingSearchCategory, mappingSortColumn, mappingSortDirection]);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            if (!res.ok) { console.error(`Failed to fetch categories: ${res.status}`); return; }
            const data = await res.json();
            setCategories(Array.isArray(data) ? data : []);
        } catch {
            console.error('Failed to fetch categories');
        }
    };

    const fetchTitleMappings = useCallback(async () => {
        setTitleMappingsLoading(true);
        try {
            const params = new URLSearchParams({
                limit: titleLimit.toString(),
                offset: (titleMappingsPage * titleLimit).toString(),
                sortColumn: titleSortColumn,
                sortDirection: titleSortDirection,
            });
            if (debouncedTitleSearchTitle) params.set('searchTitle', debouncedTitleSearchTitle);
            if (debouncedTitleSearchCategory) params.set('searchCategory', debouncedTitleSearchCategory);

            const res = await fetch(`/api/title-mappings?${params}`);
            if (res.status === 401) { setFetchError('Session expired — please log in again.'); setTitleMappings([]); setTitleMappingsTotal(0); return; }
            if (!res.ok) { setFetchError(`Server error (${res.status}) — could not load title mappings.`); setTitleMappings([]); setTitleMappingsTotal(0); return; }
            setFetchError(null);
            const data = await res.json();
            setTitleMappings(data.mappings);
            setTitleMappingsTotal(data.total);
        } catch {
            setFetchError('Could not connect to server — check your connection and try again.');
        } finally {
            setTitleMappingsLoading(false);
        }
    }, [titleMappingsPage, debouncedTitleSearchTitle, debouncedTitleSearchCategory, titleSortColumn, titleSortDirection]);

    const fetchAds = useCallback(async (
        country: string, sDate: string, eDate: string, page: number,
        uFilter: string, emptyCategory: boolean, typeFilter: string,
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
                uniqueFilter: uFilter,
                emptyCategory: emptyCategory.toString(),
                ...(typeFilter ? { typeFilter } : {}),
                sortColumn: sortCol,
                sortDirection: sortDir,
            });
            if (eDate) params.set('endDate', eDate);
            if (sCat) params.set('searchCategory', sCat);
            if (sTitle) params.set('searchTitle', sTitle);
            if (sLanding) params.set('searchLandingPage', sLanding);
            const res = await fetch(`/api/ads?${params}`);
            if (res.status === 401) { setFetchError('Session expired — please log in again.'); setAds([]); setAdsTotal(0); return; }
            if (!res.ok) { setFetchError(`Server error (${res.status}) — could not load ads.`); setAds([]); setAdsTotal(0); return; }
            setFetchError(null);
            const data = await res.json();
            setAds(data.ads || []);
            setAdsTotal(data.total || 0);
        } catch {
            setFetchError('Could not connect to server — check your connection and try again.');
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

    const handleExportAds = async () => {
        if (!selectedCountry || !startDate) return;
        setExporting(true);
        try {
            const params = new URLSearchParams({
                country: selectedCountry,
                date: startDate,
                uniqueFilter,
                emptyCategory: filterEmptyCategory.toString(),
                sortColumn,
                sortDirection,
            });
            if (endDate) params.set('endDate', endDate);
            if (filterType) params.set('typeFilter', filterType);
            if (debouncedSearchCategory) params.set('searchCategory', debouncedSearchCategory);
            if (debouncedSearchTitle) params.set('searchTitle', debouncedSearchTitle);
            if (debouncedSearchLandingPage) params.set('searchLandingPage', debouncedSearchLandingPage);

            const res = await fetch(`/api/ads/export?${params}`);
            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ads-${selectedCountry}-${startDate}${endDate ? `-to-${endDate}` : ''}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            setError('Failed to export ads');
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        fetchMappings();
    }, [fetchMappings]);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (activeTab === 'titles') {
            fetchTitleMappings();
        }
    }, [activeTab, fetchTitleMappings]);

    useEffect(() => {
        if (selectedCountry && startDate) {
            fetchAds(selectedCountry, startDate, endDate, adsPage, uniqueFilter, filterEmptyCategory, filterType, debouncedSearchCategory, debouncedSearchTitle, debouncedSearchLandingPage, sortColumn, sortDirection);
        }
    }, [selectedCountry, startDate, endDate, adsPage, uniqueFilter, filterEmptyCategory, filterType, debouncedSearchCategory, debouncedSearchTitle, debouncedSearchLandingPage, sortColumn, sortDirection, fetchAds]);

    const handleMappingSort = (column: string) => {
        if (mappingSortColumn === column) {
            setMappingSortDirection(mappingSortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setMappingSortColumn(column);
            setMappingSortDirection('desc');
        }
        setPage(0);
    };

    const handleTitleMappingSort = (column: string) => {
        if (titleSortColumn === column) {
            setTitleSortDirection(titleSortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setTitleSortColumn(column);
            setTitleSortDirection('desc');
        }
        setTitleMappingsPage(0);
    };

    const handleEditTitleMapping = (mapping: TitleMapping) => {
        setEditingTitleId(mapping.id);
        setEditTitleCategory(mapping.category || '');
    };

    const handleSaveTitleEdit = async (id: number) => {
        setSavingTitle(true);
        setError('');
        try {
            const res = await fetch(`/api/title-mappings/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: editTitleCategory }),
            });

            if (!res.ok) throw new Error('Failed to update');

            setEditingTitleId(null);
            setSuccess('Title mapping updated.');

            fetchTitleMappings();
            fetchCategories();
        } catch {
            setError('Failed to update title mapping');
        } finally {
            setSavingTitle(false);
        }
    };

    const handleDeleteTitleMapping = (id: number) => {
        setConfirmAction({
            message: 'Are you sure you want to delete this title mapping?',
            onConfirm: async () => {
                setConfirmAction(null);
                setDeletingTitle(id);
                setError('');
                try {
                    const res = await fetch(`/api/title-mappings/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete');
                    setSuccess('Title mapping deleted.');

                    fetchTitleMappings();
                } catch {
                    setError('Failed to delete title mapping');
                } finally {
                    setDeletingTitle(null);
                }
            },
        });
    };

    const handleAddTitleMapping = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setAddingTitle(true);

        try {
            const res = await fetch('/api/title-mappings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTitle,
                    category: newTitleCategory,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create');
            }

            setShowAddTitleModal(false);
            setNewTitle('');
            setNewTitleCategory('');
            setSuccess('Title mapping created.');

            fetchTitleMappings();
            fetchCategories();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create title mapping');
        } finally {
            setAddingTitle(false);
        }
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
            // Re-fetch current tab's data
            if (activeTab === 'mappings') {
                fetchMappings();
            } else if (activeTab === 'titles') {
                fetchTitleMappings();
            } else if (activeTab === 'categories') {
                fetchAllCategories(catCountry, catStartDate, catEndDate);
            } else if (selectedCountry && startDate) {
                fetchAds(selectedCountry, startDate, endDate, adsPage, uniqueFilter, filterEmptyCategory, filterType, debouncedSearchCategory, debouncedSearchTitle, debouncedSearchLandingPage, sortColumn, sortDirection);
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
            if (res.status === 401) { setFetchError('Session expired — please log in again.'); setAllCategories([]); return; }
            if (!res.ok) { setFetchError(`Server error (${res.status}) — could not load categories.`); setAllCategories([]); return; }
            setFetchError(null);
            const data = await res.json();
            setAllCategories(Array.isArray(data) ? data : []);
        } catch {
            setFetchError('Could not connect to server — check your connection and try again.');
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
        if (selectedSourceCategories.size === 0 || !mergeTarget.trim()) return;
        if (selectedSourceCategories.has(mergeTarget.trim())) {
            setError('Target category cannot be one of the selected source categories');
            return;
        }
        const sourceList = Array.from(selectedSourceCategories);
        setConfirmAction({
            message: `Merge ${sourceList.length} categor${sourceList.length === 1 ? 'y' : 'ies'} into "${mergeTarget.trim()}"?\n\nSources:\n${sourceList.map(s => `  • ${s}`).join('\n')}\n\nAll records will be updated to use the target category name.`,
            onConfirm: async () => {
                setConfirmAction(null);
                setMerging(true);
                setError('');
                let totalMappings = 0;
                let totalTitleMappings = 0;
                let totalAds = 0;
                try {
                    for (const source of sourceList) {
                        const res = await fetch('/api/categories/rename', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                oldCategory: source,
                                newCategory: mergeTarget.trim(),
                            }),
                        });

                        if (!res.ok) throw new Error(`Failed to merge "${source}"`);

                        const data = await res.json();
                        totalMappings += data.mappingsUpdated;
                        totalTitleMappings += data.titleMappingsUpdated;
                        totalAds += data.adsUpdated;
                    }
                    setSuccess(`Merged ${sourceList.length} categories! ${totalMappings} URL mappings, ${totalTitleMappings} title mappings, and ${totalAds} ads updated.`);
        
                    setSelectedSourceCategories(new Set());
                    setMergeTarget('');
                    fetchAllCategories(catCountry, catStartDate, catEndDate);
                    fetchCategories();
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to merge categories');
                } finally {
                    setMerging(false);
                }
            },
        });
    };

    const handleCategorySort = (column: 'category' | 'mapping_count' | 'ad_count' | 'title_mapping_count') => {
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
                            onClick={() => { setActiveTab('ads'); setFetchError(null); }}
                        >
                            Ads Browser
                        </button>
                        <button
                            className={`nav-tab ${activeTab === 'mappings' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('mappings'); setFetchError(null); }}
                        >
                            URL Mappings
                        </button>
                        <button
                            className={`nav-tab ${activeTab === 'titles' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('titles'); setFetchError(null); }}
                        >
                            Title Mappings
                        </button>
                        <button
                            className={`nav-tab ${activeTab === 'categories' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('categories'); setFetchError(null); }}
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

                    {activeTab === 'titles' ? (
                        <>
                            <div className="admin-header">
                                <div className="header-title-group">
                                    <h1>Title Mappings</h1>
                                    <button className="info-btn" onClick={() => setInfoModal('titles')}>&#9432; How this works</button>
                                </div>
                                <button
                                    onClick={() => setShowAddTitleModal(true)}
                                    className="btn btn-primary"
                                >
                                    Add Title Mapping
                                </button>
                            </div>

                            <div className="search-controls">
                                <div className="search-field">
                                    <label htmlFor="title-search-title">Title</label>
                                    <input
                                        id="title-search-title"
                                        type="text"
                                        value={titleSearchTitle}
                                        onChange={(e) => { setTitleSearchTitle(e.target.value); setTitleMappingsPage(0); }}
                                        placeholder="Search by title..."
                                    />
                                </div>
                                <div className="search-field">
                                    <label htmlFor="title-search-category">Category</label>
                                    <input
                                        id="title-search-category"
                                        type="text"
                                        value={titleSearchCategory}
                                        onChange={(e) => { setTitleSearchCategory(e.target.value); setTitleMappingsPage(0); }}
                                        placeholder="Search by category..."
                                        list="categories"
                                    />
                                </div>
                            </div>

                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th className="sortable-header" onClick={() => handleTitleMappingSort('id')}>
                                                ID {titleSortColumn === 'id' && (titleSortDirection === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="sortable-header" onClick={() => handleTitleMappingSort('title')}>
                                                Title {titleSortColumn === 'title' && (titleSortDirection === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="sortable-header" onClick={() => handleTitleMappingSort('category')}>
                                                Category {titleSortColumn === 'category' && (titleSortDirection === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th>Translated Title</th>
                                            <th className="sortable-header" onClick={() => handleTitleMappingSort('created_at')}>
                                                Created {titleSortColumn === 'created_at' && (titleSortDirection === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {titleMappingsLoading ? (
                                            <tr>
                                                <td colSpan={6} className="empty-cell">
                                                    Loading...
                                                </td>
                                            </tr>
                                        ) : titleMappings.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="empty-cell">
                                                    {fetchError || 'No title mappings found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            titleMappings.map((mapping) => (
                                                <tr key={mapping.id}>
                                                    <td className="id-cell">{mapping.id}</td>
                                                    <td className="url-cell">
                                                        {highlightMatch(mapping.title, debouncedTitleSearchTitle)}
                                                    </td>
                                                    <td className="category-cell">
                                                        {editingTitleId === mapping.id ? (
                                                            <input
                                                                type="text"
                                                                value={editTitleCategory}
                                                                onChange={(e) => setEditTitleCategory(e.target.value)}
                                                                className="edit-input"
                                                                list="categories"
                                                            />
                                                        ) : (
                                                            <span className="category-badge">
                                                                {highlightMatch(mapping.category || '', debouncedTitleSearchCategory)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="url-cell">
                                                        {mapping.translated_title || ''}
                                                    </td>
                                                    <td className="date-cell">
                                                        {new Date(mapping.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="actions-cell">
                                                        {editingTitleId === mapping.id ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleSaveTitleEdit(mapping.id)}
                                                                    className="action-btn save-btn"
                                                                    disabled={savingTitle}
                                                                >
                                                                    {savingTitle ? 'Saving...' : 'Save'}
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingTitleId(null)}
                                                                    className="action-btn cancel-btn"
                                                                    disabled={savingTitle}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => handleEditTitleMapping(mapping)}
                                                                    className="action-btn edit-btn"
                                                                    disabled={deletingTitle === mapping.id}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteTitleMapping(mapping.id)}
                                                                    className="action-btn delete-btn"
                                                                    disabled={deletingTitle === mapping.id}
                                                                >
                                                                    {deletingTitle === mapping.id ? 'Deleting...' : 'Delete'}
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
                                        Showing {titleMappingsTotal === 0 ? 0 : titleMappingsPage * titleLimit + 1} to {Math.min((titleMappingsPage + 1) * titleLimit, titleMappingsTotal)} of {titleMappingsTotal} results
                                    </div>
                                    <div className="pagination-controls">
                                        <button
                                            onClick={() => setTitleMappingsPage((p) => Math.max(0, p - 1))}
                                            disabled={titleMappingsPage === 0}
                                            className="pagination-btn"
                                        >
                                            Previous
                                        </button>
                                        <span className="pagination-page">
                                            Page {titleMappingsPage + 1} of {Math.ceil(titleMappingsTotal / titleLimit) || 1}
                                        </span>
                                        <button
                                            onClick={() => setTitleMappingsPage((p) => p + 1)}
                                            disabled={titleMappingsPage >= Math.ceil(titleMappingsTotal / titleLimit) - 1}
                                            className="pagination-btn"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {showAddTitleModal && (
                                <div className="modal-overlay">
                                    <div className="modal">
                                        <div className="modal-header">
                                            <h2>Add New Title Mapping</h2>
                                            <button
                                                className="close-icon"
                                                onClick={() => {
                                                    setShowAddTitleModal(false);
                                                    setNewTitle('');
                                                    setNewTitleCategory('');
                                                }}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                        <form onSubmit={handleAddTitleMapping} className="modal-form">
                                            <div className="form-group">
                                                <label htmlFor="newTitle">Title</label>
                                                <input
                                                    id="newTitle"
                                                    type="text"
                                                    value={newTitle}
                                                    onChange={(e) => setNewTitle(e.target.value)}
                                                    required
                                                    placeholder="Ad title text"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="newTitleCategory">Category</label>
                                                <input
                                                    id="newTitleCategory"
                                                    type="text"
                                                    value={newTitleCategory}
                                                    onChange={(e) => setNewTitleCategory(e.target.value)}
                                                    required
                                                    placeholder="Enter or select a category"
                                                    list="categories"
                                                />
                                            </div>
                                            <div className="modal-actions">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowAddTitleModal(false);
                                                        setNewTitle('');
                                                        setNewTitleCategory('');
                                                    }}
                                                    className="btn btn-secondary"
                                                    disabled={addingTitle}
                                                >
                                                    Cancel
                                                </button>
                                                <button type="submit" className="btn btn-primary" disabled={addingTitle}>
                                                    {addingTitle ? 'Adding...' : 'Add Title Mapping'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : activeTab === 'categories' ? (
                        <>
                            <div className="admin-header">
                                <div className="header-title-group">
                                    <h1>Category Deduplication</h1>
                                    <button className="info-btn" onClick={() => setInfoModal('categories')}>&#9432; How this works</button>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    disabled={normalising}
                                    onClick={() => {
                                        setConfirmAction({
                                            message: 'This will deduplicate categories and backcategorise all ads. Data may be temporarily inconsistent — this can take several minutes.',
                                            onConfirm: async () => {
                                                setConfirmAction(null);
                                                setNormalising(true);
                                                try {
                                                    const res = await fetch('/api/categories/normalise', { method: 'POST' });
                                                    if (!res.ok) {
                                                        const data = await res.json();
                                                        alert(data.error || 'Failed to start normalisation');
                                                        setNormalising(false);
                                                        return;
                                                    }
                                                    // Poll status every 5s
                                                    const poll = setInterval(async () => {
                                                        try {
                                                            const statusRes = await fetch('/api/categories/normalise/status');
                                                            const status = await statusRes.json();
                                                            if (status.status !== 'running') {
                                                                clearInterval(poll);
                                                                setNormalising(false);
                                                                if (status.status === 'completed') {
                                                                    const s = status.stats;
                                                                    alert(`Normalisation complete!\n\nDeduplicated: ${s.deduplicated.urlMappings} URL mappings, ${s.deduplicated.ads} ads, ${s.deduplicated.titleMappings} title mappings\n\nBackcategorised: ${s.backcategorised.urlMappingsFixed} URL mappings fixed, ${s.backcategorised.titleMappingsFixed} title mappings fixed, ${s.backcategorised.adsFromUrlMappings + s.backcategorised.adsFromTitleMappings} ads updated`);
                                                                } else {
                                                                    alert('Normalisation failed: ' + (status.error || 'Unknown error'));
                                                                }
                                                                fetchAllCategories(catCountry, catStartDate, catEndDate);
                                                            }
                                                        } catch {
                                                            clearInterval(poll);
                                                            setNormalising(false);
                                                            alert('Lost connection while polling normalisation status');
                                                        }
                                                    }, 5000);
                                                } catch {
                                                    setNormalising(false);
                                                    alert('Failed to start normalisation');
                                                }
                                            },
                                        });
                                    }}
                                >
                                    {normalising ? 'Normalising...' : 'Normalise Data'}
                                </button>
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
                                            URL Map {categorySortColumn === 'mapping_count' && (categorySortDirection === 'asc' ? '↑' : '↓')}
                                        </span>
                                        <span className="sortable-header dedup-header-count" onClick={() => handleCategorySort('title_mapping_count')}>
                                            Title Map {categorySortColumn === 'title_mapping_count' && (categorySortDirection === 'asc' ? '↑' : '↓')}
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
                                        <div className="ads-empty">{fetchError || 'No categories found.'}</div>
                                    ) : (
                                        <div className="dedup-list-body">
                                            {filteredAllCategories.map((cat) => (
                                                <div
                                                    key={cat.category}
                                                    className={`dedup-row ${selectedSourceCategories.has(cat.category) ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        setSelectedSourceCategories(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(cat.category)) {
                                                                next.delete(cat.category);
                                                            } else {
                                                                next.add(cat.category);
                                                            }
                                                            return next;
                                                        });
                                                    }}
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

                                <div className="dedup-merge-panel">
                                    {selectedSourceCategories.size > 0 ? (
                                        <>
                                            <h3>Merge {selectedSourceCategories.size} Categor{selectedSourceCategories.size === 1 ? 'y' : 'ies'}</h3>
                                            <div className="dedup-merge-source">
                                                <label>Sources (will be renamed)</label>
                                                <div className="dedup-source-list">
                                                    {Array.from(selectedSourceCategories).map(src => (
                                                        <div key={src} className="dedup-source-value">
                                                            {src}
                                                            <button
                                                                className="dedup-source-remove"
                                                                onClick={() => setSelectedSourceCategories(prev => {
                                                                    const next = new Set(prev);
                                                                    next.delete(src);
                                                                    return next;
                                                                })}
                                                                title="Remove"
                                                            >&times;</button>
                                                        </div>
                                                    ))}
                                                </div>
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
                                                {merging ? 'Merging...' : `Merge ${selectedSourceCategories.size} → ${mergeTarget.trim() || '...'}`}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="dedup-merge-empty">
                                            Click categories from the list to select them for merging. You can select multiple.
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
                                <div className="header-title-group">
                                    <h1>URL Mapping Admin</h1>
                                    <button className="info-btn" onClick={() => setInfoModal('mappings')}>&#9432; How this works</button>
                                </div>
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
                                                    {fetchError || 'No mappings found'}
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
                                <div className="header-title-group">
                                    <h1>Ads Browser</h1>
                                    <button className="info-btn" onClick={() => setInfoModal('ads')}>&#9432; How this works</button>
                                </div>
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
                            </div>

                            <div className="filter-controls">
                                <div className="filter-checkboxes">
                                    <select
                                        value={uniqueFilter}
                                        onChange={(e) => {
                                            setUniqueFilter(e.target.value);
                                            setAdsPage(0);
                                        }}
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
                                            onChange={(e) => {
                                                setFilterEmptyCategory(e.target.checked);
                                                setAdsPage(0);
                                            }}
                                        />
                                        Empty/unknown categories
                                    </label>
                                    <select
                                        value={filterType}
                                        onChange={(e) => {
                                            setFilterType(e.target.value);
                                            setAdsPage(0);
                                        }}
                                        style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '2px solid #e8e8e8', fontSize: '0.85rem' }}
                                    >
                                        <option value="">All types</option>
                                        <option value="url_mapping">URL Mapping</option>
                                        <option value="title_mapping">Title Mapping</option>
                                        <option value="ai_response">AI Response</option>
                                    </select>
                                    <button
                                        onClick={handleExportAds}
                                        disabled={exporting || !selectedCountry || !startDate}
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
                                                                            <span className={`type-tag ${ad.type.replace('_', '-')}`}>
                                                                                {ad.type === 'url_mapping' ? 'URL Mapping' : ad.type === 'title_mapping' ? 'Title Mapping' : ad.type === 'ai_response' ? 'AI Response' : ad.type}
                                                                            </span>
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
                                                            <div className="cleaned-url" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>
                                                                <a
                                                                    href={ad.landing_page}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="url-link"
                                                                    title={ad.landing_page}
                                                                >
                                                                    {highlightMatch(cleanUrl(ad.landing_page), debouncedSearchLandingPage)}
                                                                </a>
                                                            </div>
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
                                        {fetchError || 'No ads found for the selected country and date range.'}
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

            {/* Info modal */}
            {infoModal && (
                <div className="modal-overlay" onClick={() => setInfoModal(null)}>
                    <div className="info-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="info-modal-header">
                            <h2>{infoModal === 'ads' ? 'Ads Browser' : infoModal === 'mappings' ? 'URL Mappings' : infoModal === 'titles' ? 'Title Mappings' : infoModal === 'categories' ? 'Categories & Normalise Data' : ''}</h2>
                            <button className="close-icon" onClick={() => setInfoModal(null)}>&times;</button>
                        </div>
                        <div className="info-modal-body">
                            {infoModal === 'ads' && (
                                <>
                                    <p><strong>What is this?</strong></p>
                                    <p>This is where you can see every ad we&apos;ve scraped. Pick a country and date range and you&apos;ll get a list of ads &mdash; each one shows the ad image, its title, where it links to, and what category it&apos;s been tagged with (if any).</p>

                                    <p><strong>Categorising ads</strong></p>
                                    <p>The main job here is to give each ad a category. When you set a category on an ad (e.g. tagging a Sportsbet ad as &ldquo;Gambling&rdquo;), two things happen:</p>
                                    <ul>
                                        <li>That ad gets the category you chose.</li>
                                        <li>A URL mapping is created automatically, so <em>every other ad</em> that links to the same website &mdash; past and future &mdash; gets the same category too. For example, if you categorise one ad pointing to <code>sportsbet.com.au</code>, all 500+ other ads pointing there will also become &ldquo;Gambling&rdquo;.</li>
                                    </ul>

                                    <p><strong>Finding ads that need attention</strong></p>
                                    <ul>
                                        <li><strong>Show only uncategorised</strong> &mdash; filters to ads that don&apos;t have a category yet. This is the quickest way to find work to do.</li>
                                        <li><strong>Show only unique URLs</strong> &mdash; hides duplicate landing pages so you only see each website once. Useful when the same ad appears dozens of times.</li>
                                        <li><strong>Search</strong> &mdash; look for ads by category name, title text, or landing page URL.</li>
                                    </ul>

                                    <p><strong>Not Interested</strong></p>
                                    <p>If an ad isn&apos;t relevant (e.g. a generic news article, not a real ad), you can mark it as &ldquo;Not Interested&rdquo; to hide it from future review.</p>
                                </>
                            )}
                            {infoModal === 'mappings' && (
                                <>
                                    <p><strong>What is this?</strong></p>
                                    <p>URL mappings are rules that automatically assign a category to any ad based on its landing page URL. When a new ad comes in, the system checks if its URL matches a mapping &mdash; if it does, the ad gets categorised automatically.</p>

                                    <p><strong>How does matching work?</strong></p>
                                    <p>URLs are &ldquo;cleaned&rdquo; before matching: query parameters (tracking codes), www prefixes, and trailing slashes are removed, so <code>https://www.example.com/page?ref=123</code> and <code>https://example.com/page</code> are treated as the same URL.</p>

                                    <p><strong>What can I do here?</strong></p>
                                    <ul>
                                        <li><strong>Add a mapping</strong> &mdash; enter a URL and a category. All existing ads with that URL will be updated immediately.</li>
                                        <li><strong>Edit a mapping&apos;s category</strong> &mdash; all ads using that URL will be re-categorised.</li>
                                        <li><strong>Delete a mapping</strong> &mdash; removes the rule (existing ads keep their current category).</li>
                                        <li><strong>Search</strong> by URL or category to find specific mappings.</li>
                                    </ul>
                                </>
                            )}
                            {infoModal === 'titles' && (
                                <>
                                    <p><strong>What is this?</strong></p>
                                    <p>Title mappings work like URL mappings, but they match ads by their <em>title text</em> instead of their URL. This is useful when many different URLs share the same ad title (e.g. a brand running the same ad across many publishers).</p>

                                    <p><strong>How does matching work?</strong></p>
                                    <p>Titles are compared with extra whitespace removed, so minor formatting differences are ignored. Title mappings are lower priority than URL mappings &mdash; if an ad matches both a URL mapping and a title mapping, the URL mapping wins.</p>

                                    <p><strong>What can I do here?</strong></p>
                                    <ul>
                                        <li><strong>Add a title mapping</strong> &mdash; enter a title and a category.</li>
                                        <li><strong>Edit or delete</strong> existing title mappings.</li>
                                        <li><strong>Search</strong> by title or category.</li>
                                    </ul>
                                </>
                            )}
                            {infoModal === 'categories' && (
                                <>
                                    <p><strong>What is this page?</strong></p>
                                    <p>This page lists every category in the system and shows how many ads, URL mappings, and title mappings use each one. Use it to spot duplicates and clean things up.</p>

                                    <p><strong>Merging categories</strong></p>
                                    <p>If you notice two categories that should be one (e.g. &ldquo;Gambling&rdquo; and &ldquo;Online Gambling&rdquo;), click on the one you want to get rid of, type the name you want to keep, and hit merge. Everything using the old name switches to the new one.</p>

                                    <hr />

                                    <p><strong>What does &ldquo;Normalise Data&rdquo; do?</strong></p>
                                    <p>It&apos;s a big cleanup button that fixes two problems at once. It takes a few minutes to run, but you can safely leave it going.</p>

                                    <p><strong>1. Fixes duplicate category names</strong></p>
                                    <p>Over time the same category can get entered in slightly different ways. For example, you might have:</p>
                                    <ul>
                                        <li>&ldquo;Health &amp; Beauty&rdquo;</li>
                                        <li>&ldquo;health &amp; beauty&rdquo;</li>
                                        <li>&ldquo;Health&amp;Beauty&rdquo;</li>
                                        <li>&ldquo;Health  &amp;  Beauty&rdquo;</li>
                                    </ul>
                                    <p>Normalise finds all these variants and merges them into one name &mdash; whichever version is used the most. So if &ldquo;Health &amp; Beauty&rdquo; appears 200 times and &ldquo;health &amp; beauty&rdquo; appears 50 times, everything becomes &ldquo;Health &amp; Beauty&rdquo;.</p>

                                    <p><strong>2. Fills in missing categories using your existing work</strong></p>
                                    <p>When you categorise an ad (say you tag <code>sportsbet.com.au</code> as &ldquo;Gambling&rdquo;), that only applies going forward. But there might be hundreds of older ads pointing to <code>sportsbet.com.au</code> that were scraped <em>before</em> you created that mapping &mdash; those old ads are still sitting there with no category.</p>
                                    <p>Normalise goes back through <strong>all historical data</strong> and applies your mappings retroactively. Every ad that matches a URL or title mapping you&apos;ve set up gets the correct category, no matter how old it is. This means your reports and category counts will include the full picture, not just ads scraped after you did the categorisation work.</p>
                                    <p>It also cross-references between URL and title mappings. For example: if a URL mapping is marked &ldquo;unknown&rdquo; but an ad with that URL has a title you&apos;ve already categorised, it will use the title mapping to fix the URL mapping too.</p>

                                    <p><strong>Is it safe?</strong></p>
                                    <p>Yes &mdash; it never deletes anything. It only fills in blanks and fixes inconsistencies. The numbers on this page might jump around while it&apos;s running, but once it finishes the page refreshes automatically and everything will be consistent.</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Loading overlay */}
            {(saving || adding || savingAd || merging || savingTitle || addingTitle) && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>{saving ? 'Updating records...' : adding ? 'Creating mapping...' : merging ? 'Merging categories...' : savingTitle ? 'Updating title mapping...' : addingTitle ? 'Creating title mapping...' : 'Updating ad category...'}</p>
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
