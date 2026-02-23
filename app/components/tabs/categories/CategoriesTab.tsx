'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { CategoryWithCounts } from '@/app/lib/types';
import { COUNTRIES } from '@/app/lib/constants';
import CategoryList from './CategoryList';
import MergePanel from './MergePanel';

interface CategoriesTabProps {
    setError: (msg: string) => void;
    setSuccess: (msg: string) => void;
    setConfirmAction: (action: { message: string; onConfirm: () => void } | null) => void;
    setInfoModal: (topic: string | null) => void;
    handleSessionExpired: () => void;
    fetchCategories: () => void;
    refreshTrigger: number;
    onMergingChange: (merging: boolean) => void;
    onUrlParamsChange: (params: Record<string, string>) => void;
}

export default function CategoriesTab({
    setError,
    setSuccess,
    setConfirmAction,
    setInfoModal,
    handleSessionExpired,
    fetchCategories,
    refreshTrigger,
    onMergingChange,
    onUrlParamsChange,
}: CategoriesTabProps) {
    const [allCategories, setAllCategories] = useState<CategoryWithCounts[]>([]);
    const [loadingAllCategories, setLoadingAllCategories] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

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

    // Fetch all categories
    const fetchAllCategories = useCallback(async (country?: string, sDate?: string, eDate?: string) => {
        setLoadingAllCategories(true);
        try {
            const params = new URLSearchParams();
            if (country) params.set('country', country);
            if (sDate) params.set('startDate', sDate);
            if (eDate) params.set('endDate', eDate);
            const qs = params.toString();
            const res = await fetch(`/api/categories/all${qs ? `?${qs}` : ''}`);
            if (res.status === 401) { handleSessionExpired(); return; }
            if (!res.ok) {
                setFetchError(`Server error (${res.status}) \u2014 could not load categories.`);
                setAllCategories([]);
                return;
            }
            setFetchError(null);
            const data = await res.json();
            setAllCategories(Array.isArray(data) ? data : []);
        } catch {
            setFetchError('Could not connect to server \u2014 check your connection and try again.');
        } finally {
            setLoadingAllCategories(false);
        }
    }, [handleSessionExpired]);

    // Fetch on mount and when filters change
    useEffect(() => {
        fetchAllCategories(catCountry, catStartDate, catEndDate);
    }, [catCountry, catStartDate, catEndDate, fetchAllCategories]);

    // Watch refreshTrigger to refetch
    useEffect(() => {
        if (refreshTrigger > 0) {
            fetchAllCategories(catCountry, catStartDate, catEndDate);
        }
    }, [refreshTrigger, catCountry, catStartDate, catEndDate, fetchAllCategories]);

    // Report URL params
    useEffect(() => {
        const params: Record<string, string> = {};
        if (catCountry) params.catCountry = catCountry;
        if (catStartDate) params.catStartDate = catStartDate;
        if (catEndDate) params.catEndDate = catEndDate;
        onUrlParamsChange(params);
    }, [catCountry, catStartDate, catEndDate, onUrlParamsChange]);

    // Sort handler
    const handleCategorySort = (column: 'category' | 'mapping_count' | 'ad_count' | 'title_mapping_count') => {
        if (categorySortColumn === column) {
            setCategorySortDirection(categorySortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setCategorySortColumn(column);
            setCategorySortDirection(column === 'category' ? 'asc' : 'desc');
        }
    };

    // Filtered and sorted categories
    const filteredAllCategories = useMemo(() => {
        return allCategories
            .filter((c) => c.category.toLowerCase().includes(categorySearch.toLowerCase()))
            .sort((a, b) => {
                const dir = categorySortDirection === 'asc' ? 1 : -1;
                if (categorySortColumn === 'category') {
                    return dir * a.category.localeCompare(b.category);
                }
                return dir * (a[categorySortColumn] - b[categorySortColumn]);
            });
    }, [allCategories, categorySearch, categorySortColumn, categorySortDirection]);

    // Merge handler
    const handleMergeCategory = () => {
        if (selectedSourceCategories.size === 0 || !mergeTarget.trim()) return;
        if (selectedSourceCategories.has(mergeTarget.trim())) {
            setError('Target category cannot be one of the selected source categories');
            return;
        }
        const sourceList = Array.from(selectedSourceCategories);
        setConfirmAction({
            message: `Merge ${sourceList.length} categor${sourceList.length === 1 ? 'y' : 'ies'} into "${mergeTarget.trim()}"?\n\nSources:\n${sourceList.map(s => `  \u2022 ${s}`).join('\n')}\n\nAll records will be updated to use the target category name.`,
            onConfirm: async () => {
                setConfirmAction(null);
                setMerging(true);
                onMergingChange(true);
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
                    onMergingChange(false);
                }
            },
        });
    };

    // Toggle category selection
    const handleToggleCategory = (category: string) => {
        setSelectedSourceCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    // Remove source from selection
    const handleRemoveSource = (category: string) => {
        setSelectedSourceCategories(prev => {
            const next = new Set(prev);
            next.delete(category);
            return next;
        });
    };

    const hasDateFilter = !!(catCountry || catStartDate || catEndDate);

    return (
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
                            message: 'This will deduplicate categories and backcategorise all ads. Data may be temporarily inconsistent \u2014 this can take several minutes.',
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
                <CategoryList
                    categories={filteredAllCategories}
                    loading={loadingAllCategories}
                    fetchError={fetchError}
                    selectedSourceCategories={selectedSourceCategories}
                    onToggleCategory={handleToggleCategory}
                    categorySortColumn={categorySortColumn}
                    categorySortDirection={categorySortDirection}
                    onSort={handleCategorySort}
                    categorySearch={categorySearch}
                    hasDateFilter={hasDateFilter}
                />
                <MergePanel
                    selectedSourceCategories={selectedSourceCategories}
                    onRemoveSource={handleRemoveSource}
                    mergeTarget={mergeTarget}
                    onMergeTargetChange={setMergeTarget}
                    onMerge={handleMergeCategory}
                    merging={merging}
                />
            </div>

            <datalist id="all-categories-list">
                {allCategories.map((cat) => (
                    <option key={cat.category} value={cat.category} />
                ))}
            </datalist>
        </>
    );
}
