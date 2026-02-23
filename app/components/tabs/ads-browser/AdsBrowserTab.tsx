'use client';

import { useState, useEffect, useCallback } from 'react';
import { Ad } from '@/app/lib/types';
import { ADS_LIMIT } from '@/app/lib/constants';
import { useDebounce } from '@/app/hooks/useDebounce';
import Pagination from '@/app/components/shared/Pagination';
import { cleanUrl } from '@/app/lib/utils';
import AdsFilters from './AdsFilters';
import AdsTable from './AdsTable';

interface AdsBrowserTabProps {
    setError: (msg: string) => void;
    setSuccess: (msg: string) => void;
    setConfirmAction: (action: { message: string; onConfirm: () => void } | null) => void;
    setInfoModal: (topic: string | null) => void;
    handleSessionExpired: () => void;
    fetchCategories: () => void;
    refreshTrigger: number;
    onSavingAdChange: (saving: boolean) => void;
    onUrlParamsChange: (params: Record<string, string>) => void;
    initialCountry: string;
    initialStartDate: string;
    initialEndDate: string;
    initialAdsPage: number;
}

export default function AdsBrowserTab({
    setError,
    setSuccess,
    setConfirmAction,
    setInfoModal,
    handleSessionExpired,
    fetchCategories,
    refreshTrigger,
    onSavingAdChange,
    onUrlParamsChange,
    initialCountry,
    initialStartDate,
    initialEndDate,
    initialAdsPage,
}: AdsBrowserTabProps) {
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
    const [sortColumn, setSortColumn] = useState('occurrences');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [exporting, setExporting] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const debouncedSearchCategory = useDebounce(searchCategory, 400);
    const debouncedSearchTitle = useDebounce(searchTitle, 400);
    const debouncedSearchLandingPage = useDebounce(searchLandingPage, 400);

    const adsLimit = ADS_LIMIT;

    const fetchAds = useCallback(async () => {
        if (!selectedCountry || !startDate) {
            setAds([]);
            setAdsTotal(0);
            return;
        }

        setLoadingAds(true);
        setFetchError(null);

        try {
            const params = new URLSearchParams({
                country: selectedCountry,
                date: startDate,
                limit: adsLimit.toString(),
                offset: (adsPage * adsLimit).toString(),
                uniqueFilter,
                emptyCategory: filterEmptyCategory.toString(),
                typeFilter: filterType,
                endDate,
                searchCategory: debouncedSearchCategory,
                searchTitle: debouncedSearchTitle,
                searchLandingPage: debouncedSearchLandingPage,
                sortColumn,
                sortDirection,
            });

            const res = await fetch(`/api/ads?${params}`);
            if (res.status === 401) {
                handleSessionExpired();
                return;
            }
            if (!res.ok) throw new Error('Failed to fetch ads');

            const data = await res.json();
            setAds(data.ads || []);
            setAdsTotal(data.total || 0);
        } catch (err) {
            setFetchError(err instanceof Error ? err.message : 'Failed to fetch ads');
            setAds([]);
            setAdsTotal(0);
        } finally {
            setLoadingAds(false);
        }
    }, [
        selectedCountry,
        startDate,
        endDate,
        adsPage,
        adsLimit,
        uniqueFilter,
        filterEmptyCategory,
        filterType,
        debouncedSearchCategory,
        debouncedSearchTitle,
        debouncedSearchLandingPage,
        sortColumn,
        sortDirection,
        handleSessionExpired,
    ]);

    const handleEditAd = (ad: Ad) => {
        setEditingAdId(ad.id);
        setEditAdCategory(ad.category || '');
    };

    const handleSaveAdCategory = async (ad: Ad) => {
        setSavingAd(true);
        onSavingAdChange(true);

        try {
            const res = await fetch('/api/ads/category', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    landingPage: ad.landing_page,
                    category: editAdCategory,
                    title: ad.title || undefined,
                }),
            });

            if (res.status === 401) {
                handleSessionExpired();
                return;
            }
            if (!res.ok) throw new Error('Failed to save category');

            const data = await res.json();
            setEditingAdId(null);
            setEditAdCategory('');
            setSuccess(`Category updated successfully. ${data.urlMappingCount || 0} URL mapping(s) and ${data.titleMappingCount || 0} title mapping(s) affected.`);
            fetchCategories();

            const cleanedUrl = cleanUrl(ad.landing_page);
            const baseUrl = cleanedUrl.replace(/^https?:\/\/(www\.)?/, '');
            const adTitle = ad.title?.trim().toLowerCase() || '';

            setAds(prevAds =>
                prevAds.map(a => {
                    const aCleanedUrl = cleanUrl(a.landing_page);
                    const aBaseUrl = aCleanedUrl.replace(/^https?:\/\/(www\.)?/, '');
                    const urlMatch = aBaseUrl.includes(baseUrl) || baseUrl.includes(aBaseUrl);
                    const titleMatch = adTitle && a.title?.trim().toLowerCase() === adTitle;
                    if (urlMatch || titleMatch) {
                        return { ...a, category: editAdCategory };
                    }
                    return a;
                })
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save category');
        } finally {
            setSavingAd(false);
            onSavingAdChange(false);
        }
    };

    const handleCancelAdEdit = () => {
        setEditingAdId(null);
        setEditAdCategory('');
    };

    const handleMarkUninterested = (ad: Ad) => {
        setConfirmAction({
            message: `Are you sure you want to mark this as uninterested? This will delete all ads with this landing page AND title.`,
            onConfirm: async () => {
                setSavingAd(true);
                onSavingAdChange(true);

                try {
                    const res = await fetch('/api/ads/uninterested', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ landingPage: ad.landing_page }),
                    });

                    if (res.status === 401) {
                        handleSessionExpired();
                        return;
                    }
                    if (!res.ok) throw new Error('Failed to mark as uninterested');

                    const data = await res.json();
                    setSuccess(`Marked as uninterested. ${data.rowsDeleted} ad(s) deleted.`);

                    const cleanedUrl = cleanUrl(ad.landing_page);
                    const baseUrl = cleanedUrl.replace(/^https?:\/\/(www\.)?/, '');

                    setAds(prevAds =>
                        prevAds.filter(a => {
                            const aCleanedUrl = cleanUrl(a.landing_page);
                            const aBaseUrl = aCleanedUrl.replace(/^https?:\/\/(www\.)?/, '');
                            return !(aBaseUrl.includes(baseUrl) || baseUrl.includes(aBaseUrl));
                        })
                    );
                    setAdsTotal(prev => prev - data.rowsDeleted);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to mark as uninterested');
                } finally {
                    setSavingAd(false);
                    onSavingAdChange(false);
                }
            },
        });
    };

    const handleExportAds = async () => {
        setExporting(true);

        try {
            const params = new URLSearchParams({
                country: selectedCountry,
                date: startDate,
                uniqueFilter,
                emptyCategory: filterEmptyCategory.toString(),
                typeFilter: filterType,
                endDate,
                searchCategory: debouncedSearchCategory,
                searchTitle: debouncedSearchTitle,
                searchLandingPage: debouncedSearchLandingPage,
                sortColumn,
                sortDirection,
            });

            const res = await fetch(`/api/ads/export?${params}`);
            if (res.status === 401) {
                handleSessionExpired();
                return;
            }
            if (!res.ok) throw new Error('Failed to export ads');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ads-${selectedCountry}-${startDate}${endDate ? '-to-' + endDate : ''}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to export ads');
        } finally {
            setExporting(false);
        }
    };

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
        setAdsPage(0);
    };

    const handleCountryChange = (country: string) => {
        setSelectedCountry(country);
        setStartDate('');
        setEndDate('');
        setAdsPage(0);
        setAds([]);
    };

    // Fetch ads when dependencies change
    useEffect(() => {
        if (selectedCountry && startDate) {
            fetchAds();
        }
    }, [fetchAds, selectedCountry, startDate]);

    // Report URL params changes
    useEffect(() => {
        onUrlParamsChange({
            country: selectedCountry,
            startDate,
            endDate,
            adsPage: adsPage.toString(),
        });
    }, [selectedCountry, startDate, endDate, adsPage, onUrlParamsChange]);

    // Watch refreshTrigger to refetch
    useEffect(() => {
        if (refreshTrigger > 0 && selectedCountry && startDate) {
            fetchAds();
        }
    }, [refreshTrigger, fetchAds, selectedCountry, startDate]);

    return (
        <div>
            <div className="tab-header">
                <h1>Ads Browser</h1>
                <button className="info-btn" onClick={() => setInfoModal('ads')}>
                    ?
                </button>
            </div>

            <AdsFilters
                selectedCountry={selectedCountry}
                startDate={startDate}
                endDate={endDate}
                onCountryChange={handleCountryChange}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                uniqueFilter={uniqueFilter}
                filterEmptyCategory={filterEmptyCategory}
                filterType={filterType}
                exporting={exporting}
                canExport={ads.length > 0}
                onUniqueFilterChange={setUniqueFilter}
                onFilterEmptyCategoryChange={setFilterEmptyCategory}
                onFilterTypeChange={setFilterType}
                onExport={handleExportAds}
                searchCategory={searchCategory}
                searchTitle={searchTitle}
                searchLandingPage={searchLandingPage}
                onSearchCategoryChange={setSearchCategory}
                onSearchTitleChange={setSearchTitle}
                onSearchLandingPageChange={setSearchLandingPage}
            />

            {loadingAds ? (
                <div className="ads-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading ads...</p>
                </div>
            ) : ads.length > 0 ? (
                <div className="table-container">
                    <AdsTable
                        ads={ads}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        editingAdId={editingAdId}
                        editAdCategory={editAdCategory}
                        savingAd={savingAd}
                        onEditAd={handleEditAd}
                        onSaveAdCategory={handleSaveAdCategory}
                        onCancelAdEdit={handleCancelAdEdit}
                        onEditAdCategoryChange={setEditAdCategory}
                        onMarkUninterested={handleMarkUninterested}
                        debouncedSearchCategory={debouncedSearchCategory}
                        debouncedSearchTitle={debouncedSearchTitle}
                        debouncedSearchLandingPage={debouncedSearchLandingPage}
                    />
                    <Pagination
                        currentPage={adsPage}
                        totalItems={adsTotal}
                        itemsPerPage={adsLimit}
                        onPageChange={setAdsPage}
                        itemLabel="ads"
                    />
                </div>
            ) : selectedCountry && startDate ? (
                <div className="ads-empty">
                    {fetchError || 'No ads found for the selected country and date range.'}
                </div>
            ) : (
                <div className="ads-empty">
                    Select a country and a start date to browse ads.
                </div>
            )}
        </div>
    );
}
