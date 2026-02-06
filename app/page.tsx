'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
}

function HomeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize state from URL params
    const initialTab = searchParams.get('tab') === 'ads' ? 'ads' : 'mappings';
    const initialCountry = searchParams.get('country') || '';
    const initialDate = searchParams.get('date') || '';
    const initialAdsPage = parseInt(searchParams.get('adsPage') || '0');

    const [activeTab, setActiveTab] = useState<'mappings' | 'ads'>(initialTab);
    const [mappings, setMappings] = useState<UrlMapping[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
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
    const limit = 20;

    // Ads Browser state
    const [dates, setDates] = useState<string[]>([]);
    const [ads, setAds] = useState<Ad[]>([]);
    const [adsTotal, setAdsTotal] = useState(0);
    const [selectedCountry, setSelectedCountry] = useState(initialCountry);
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [adsPage, setAdsPage] = useState(initialAdsPage);
    const [loadingDates, setLoadingDates] = useState(false);
    const [loadingAds, setLoadingAds] = useState(false);
    const [editingAdId, setEditingAdId] = useState<number | null>(null);
    const [editAdCategory, setEditAdCategory] = useState('');
    const [savingAd, setSavingAd] = useState(false);
    const [filterUniqueUrls, setFilterUniqueUrls] = useState(false);
    const [filterEmptyCategory, setFilterEmptyCategory] = useState(false);
    const [sortColumn, setSortColumn] = useState<string>('id');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const adsLimit = 50;

    // Update URL when ads browser state changes
    const updateUrl = useCallback((tab: string, country: string, date: string, page: number) => {
        const params = new URLSearchParams();
        if (tab === 'ads') {
            params.set('tab', 'ads');
            if (country) params.set('country', country);
            if (date) params.set('date', date);
            if (page > 0) params.set('adsPage', page.toString());
        }
        const newUrl = params.toString() ? `?${params.toString()}` : '/';
        router.replace(newUrl, { scroll: false });
    }, [router]);

    // Sync URL when state changes
    useEffect(() => {
        updateUrl(activeTab, selectedCountry, selectedDate, adsPage);
    }, [activeTab, selectedCountry, selectedDate, adsPage, updateUrl]);

    const fetchMappings = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: (page * limit).toString(),
            });
            if (search) params.set('search', search);

            const res = await fetch(`/api/mappings?${params}`);
            const data = await res.json();
            setMappings(data.mappings);
            setTotal(data.total);
        } catch {
            setError('Failed to fetch mappings');
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            const data = await res.json();
            setCategories(data);
        } catch {
            console.error('Failed to fetch categories');
        }
    };

    const fetchDates = useCallback(async (country: string) => {
        if (!country) {
            setDates([]);
            return;
        }
        setLoadingDates(true);
        try {
            const res = await fetch(`/api/ads/dates?country=${encodeURIComponent(country)}`);
            const data = await res.json();
            // Dates come as "YYYY-MM-DD" from PostgreSQL
            setDates(Array.isArray(data) ? data : []);
        } catch {
            setError('Failed to fetch dates');
            setDates([]);
        } finally {
            setLoadingDates(false);
        }
    }, []);

    const fetchAds = useCallback(async (country: string, date: string, page: number, uniqueUrls: boolean, emptyCategory: boolean, sortCol: string, sortDir: string) => {
        if (!country || !date) {
            setAds([]);
            setAdsTotal(0);
            return;
        }
        setLoadingAds(true);
        try {
            const offset = page * adsLimit;
            const params = new URLSearchParams({
                country,
                date,
                limit: adsLimit.toString(),
                offset: offset.toString(),
                uniqueUrls: uniqueUrls.toString(),
                emptyCategory: emptyCategory.toString(),
                sortColumn: sortCol,
                sortDirection: sortDir,
            });
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
        if (selectedCountry) {
            fetchDates(selectedCountry);
        }
    }, [selectedCountry, fetchDates]);

    useEffect(() => {
        if (selectedCountry && selectedDate) {
            fetchAds(selectedCountry, selectedDate, adsPage, filterUniqueUrls, filterEmptyCategory, sortColumn, sortDirection);
        }
    }, [selectedCountry, selectedDate, adsPage, filterUniqueUrls, filterEmptyCategory, sortColumn, sortDirection, fetchAds]);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
        setAdsPage(0);
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (page === 0) {
            // Already on page 0, manually trigger fetch
            fetchMappings();
        } else {
            // Reset to page 0, useEffect will trigger fetch
            setPage(0);
        }
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
                            className={`nav-tab ${activeTab === 'mappings' ? 'active' : ''}`}
                            onClick={() => setActiveTab('mappings')}
                        >
                            URL Mappings
                        </button>
                        <button
                            className={`nav-tab ${activeTab === 'ads' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ads')}
                        >
                            Ads Browser
                        </button>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
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

                    {activeTab === 'mappings' ? (
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

                            <form onSubmit={handleSearch} className="search-section">
                                <div className="search-box">
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by URL or category..."
                                    />
                                </div>
                                <button type="submit" className="btn btn-secondary">
                                    Search
                                </button>
                            </form>

                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Cleaned URL</th>
                                            <th>Category</th>
                                            <th>Created</th>
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
                                                                {mapping.cleaned_url}
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
                                                                {mapping.category}
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

                            <datalist id="categories">
                                {categories.map((cat) => (
                                    <option key={cat} value={cat} />
                                ))}
                            </datalist>

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
                                            setSelectedDate('');
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
                                    <label htmlFor="date-select">Date</label>
                                    <select
                                        id="date-select"
                                        value={selectedDate}
                                        onChange={(e) => {
                                            setSelectedDate(e.target.value);
                                            setAdsPage(0);
                                        }}
                                        disabled={!selectedCountry || loadingDates}
                                    >
                                        <option value="">
                                            {loadingDates ? 'Loading...' : 'Select a date'}
                                        </option>
                                        {dates.map((date) => (
                                            <option key={date} value={date}>
                                                {date}
                                            </option>
                                        ))}
                                    </select>
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
                                                                        {ad.category || 'Uncategorized'}
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
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="ads-title-cell">
                                                            {ad.title || 'Untitled'}
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
                                                                {ad.landing_page}
                                                            </a>
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
                            ) : selectedCountry && selectedDate ? (
                                <div className="ads-empty">
                                    No ads found for the selected country and date.
                                </div>
                            ) : (
                                <div className="ads-empty">
                                    Select a country and date to browse ads.
                                </div>
                            )}
                        </>
                    )}
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
            {(saving || adding || savingAd) && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>{saving ? 'Updating records...' : adding ? 'Creating mapping...' : 'Updating ad category...'}</p>
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
