'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TabType, ConfirmActionState } from '@/app/lib/types';
import AppNav from '@/app/components/layout/AppNav';
import AlertBanner from '@/app/components/layout/AlertBanner';
import ConfirmModal from '@/app/components/layout/ConfirmModal';
import InfoModal from '@/app/components/layout/InfoModal';
import LoadingOverlay from '@/app/components/layout/LoadingOverlay';
import AdsBrowserTab from '@/app/components/tabs/ads-browser/AdsBrowserTab';
import UrlMappingsTab from '@/app/components/tabs/url-mappings/UrlMappingsTab';
import TitleMappingsTab from '@/app/components/tabs/title-mappings/TitleMappingsTab';
import CategoriesTab from '@/app/components/tabs/categories/CategoriesTab';

function HomeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // --- Auth ---
    const handleSessionExpired = useCallback(() => {
        fetch("/api/auth/logout", { method: "POST" }).finally(() => {
            router.push("/login");
            router.refresh();
        });
    }, [router]);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    // --- Tab routing ---
    const tabParam = searchParams.get('tab');
    const initialTab: TabType = tabParam === 'mappings' ? 'mappings' : tabParam === 'categories' ? 'categories' : tabParam === 'titles' ? 'titles' : 'ads';
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    // Parse initial URL params for each tab
    const initialCountry = searchParams.get('country') || '';
    const initialStartDate = searchParams.get('startDate') || '';
    const initialEndDate = searchParams.get('endDate') || '';
    const initialAdsPage = parseInt(searchParams.get('adsPage') || '0');
    const initialMappingsPage = parseInt(searchParams.get('mappingsPage') || '0');
    const initialMappingSearchUrl = searchParams.get('searchUrl') || '';
    const initialMappingSearchCategory = searchParams.get('searchCategory') || '';
    const initialMappingSortColumn = searchParams.get('mappingsSortCol') || 'created_at';
    const initialMappingSortDirection = (searchParams.get('mappingsSortDir') || 'desc') as 'asc' | 'desc';
    const initialTitleMappingsPage = parseInt(searchParams.get('titlesPage') || '0');

    // --- Shared state ---
    const [categories, setCategories] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
    const [infoModal, setInfoModal] = useState<string | null>(null);

    // Loading overlay booleans (reported from children)
    const [saving, setSaving] = useState(false);
    const [adding, setAdding] = useState(false);
    const [savingAd, setSavingAd] = useState(false);
    const [merging, setMerging] = useState(false);
    const [savingTitle, setSavingTitle] = useState(false);
    const [addingTitle, setAddingTitle] = useState(false);

    // Refresh
    const [refreshing, setRefreshing] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // --- Shared fetch ---
    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch('/api/categories');
            if (!res.ok) return;
            const data = await res.json();
            setCategories(Array.isArray(data) ? data : []);
        } catch {
            // silent
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // --- URL param sync ---
    const [activeTabParams, setActiveTabParams] = useState<Record<string, string>>({});

    const handleUrlParamsChange = useCallback((params: Record<string, string>) => {
        setActiveTabParams(params);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams();
        if (activeTab !== 'ads') {
            params.set('tab', activeTab);
        }
        for (const [key, value] of Object.entries(activeTabParams)) {
            if (value) params.set(key, value);
        }
        const newUrl = params.toString() ? `?${params.toString()}` : '/';
        router.replace(newUrl, { scroll: false });
    }, [activeTab, activeTabParams, router]);

    const handleTabChange = useCallback((tab: TabType) => {
        setActiveTab(tab);
        setActiveTabParams({});
        setError('');
        setSuccess('');
    }, []);

    // --- Force refresh ---
    const handleForceRefresh = async () => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/cache/clear', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to clear cache');
            setSuccess('Cache cleared. Refreshing data...');
            setRefreshTrigger(prev => prev + 1);
            fetchCategories();
        } catch {
            setError('Failed to clear cache');
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div className="app-container">
            <AppNav
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onForceRefresh={handleForceRefresh}
                onLogout={handleLogout}
                refreshing={refreshing}
            />

            <main className="app-content">
                <div className="admin-container">
                    <AlertBanner
                        error={error}
                        success={success}
                        onClearError={() => setError('')}
                        onClearSuccess={() => setSuccess('')}
                    />

                    {activeTab === 'ads' && (
                        <AdsBrowserTab
                            setError={setError}
                            setSuccess={setSuccess}
                            setConfirmAction={setConfirmAction}
                            setInfoModal={setInfoModal}
                            handleSessionExpired={handleSessionExpired}
                            fetchCategories={fetchCategories}
                            refreshTrigger={refreshTrigger}
                            onSavingAdChange={setSavingAd}
                            onUrlParamsChange={handleUrlParamsChange}
                            initialCountry={initialCountry}
                            initialStartDate={initialStartDate}
                            initialEndDate={initialEndDate}
                            initialAdsPage={initialAdsPage}
                        />
                    )}

                    {activeTab === 'mappings' && (
                        <UrlMappingsTab
                            setError={setError}
                            setSuccess={setSuccess}
                            setConfirmAction={setConfirmAction}
                            setInfoModal={setInfoModal}
                            handleSessionExpired={handleSessionExpired}
                            fetchCategories={fetchCategories}
                            refreshTrigger={refreshTrigger}
                            onSavingChange={setSaving}
                            onAddingChange={setAdding}
                            onUrlParamsChange={handleUrlParamsChange}
                            initialPage={initialMappingsPage}
                            initialSearchUrl={initialMappingSearchUrl}
                            initialSearchCategory={initialMappingSearchCategory}
                            initialSortColumn={initialMappingSortColumn}
                            initialSortDirection={initialMappingSortDirection}
                        />
                    )}

                    {activeTab === 'titles' && (
                        <TitleMappingsTab
                            setError={setError}
                            setSuccess={setSuccess}
                            setConfirmAction={setConfirmAction}
                            setInfoModal={setInfoModal}
                            handleSessionExpired={handleSessionExpired}
                            fetchCategories={fetchCategories}
                            refreshTrigger={refreshTrigger}
                            onSavingTitleChange={setSavingTitle}
                            onAddingTitleChange={setAddingTitle}
                            onUrlParamsChange={handleUrlParamsChange}
                            initialPage={initialTitleMappingsPage}
                        />
                    )}

                    {activeTab === 'categories' && (
                        <CategoriesTab
                            setError={setError}
                            setSuccess={setSuccess}
                            setConfirmAction={setConfirmAction}
                            setInfoModal={setInfoModal}
                            handleSessionExpired={handleSessionExpired}
                            fetchCategories={fetchCategories}
                            refreshTrigger={refreshTrigger}
                            onMergingChange={setMerging}
                            onUrlParamsChange={handleUrlParamsChange}
                        />
                    )}

                    <datalist id="categories">
                        {categories.map((cat) => (
                            <option key={cat} value={cat} />
                        ))}
                    </datalist>
                </div>
            </main>

            <ConfirmModal action={confirmAction} onCancel={() => setConfirmAction(null)} />
            <InfoModal topic={infoModal} onClose={() => setInfoModal(null)} />
            <LoadingOverlay
                saving={saving}
                adding={adding}
                savingAd={savingAd}
                merging={merging}
                savingTitle={savingTitle}
                addingTitle={addingTitle}
            />
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
