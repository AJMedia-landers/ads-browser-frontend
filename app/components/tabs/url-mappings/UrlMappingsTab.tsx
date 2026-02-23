'use client';

import { useState, useEffect, useCallback } from 'react';
import { UrlMapping } from '@/app/lib/types';
import { MAPPINGS_LIMIT } from '@/app/lib/constants';
import { useDebounce } from '@/app/hooks/useDebounce';
import Pagination from '@/app/components/shared/Pagination';
import UrlMappingsTable from './UrlMappingsTable';
import AddMappingModal from './AddMappingModal';

interface UrlMappingsTabProps {
    setError: (msg: string) => void;
    setSuccess: (msg: string) => void;
    setConfirmAction: (action: { message: string; onConfirm: () => void } | null) => void;
    setInfoModal: (topic: string | null) => void;
    handleSessionExpired: () => void;
    fetchCategories: () => void;
    refreshTrigger: number;
    onSavingChange: (saving: boolean) => void;
    onAddingChange: (adding: boolean) => void;
    onUrlParamsChange: (params: Record<string, string>) => void;
    initialPage: number;
    initialSearchUrl: string;
    initialSearchCategory: string;
    initialSortColumn: string;
    initialSortDirection: 'asc' | 'desc';
}

export default function UrlMappingsTab({
    setError,
    setSuccess,
    setConfirmAction,
    setInfoModal,
    handleSessionExpired,
    fetchCategories,
    refreshTrigger,
    onSavingChange,
    onAddingChange,
    onUrlParamsChange,
    initialPage,
    initialSearchUrl,
    initialSearchCategory,
    initialSortColumn,
    initialSortDirection,
}: UrlMappingsTabProps) {
    const [mappings, setMappings] = useState<UrlMapping[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(initialPage);
    const [mappingSearchUrl, setMappingSearchUrl] = useState(initialSearchUrl);
    const [mappingSearchCategory, setMappingSearchCategory] = useState(initialSearchCategory);
    const debouncedSearchUrl = useDebounce(mappingSearchUrl, 400);
    const debouncedSearchCategory = useDebounce(mappingSearchCategory, 400);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editCategory, setEditCategory] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [adding, setAdding] = useState(false);
    const [hoveredUrlId, setHoveredUrlId] = useState<number | null>(null);
    const [mappingSortColumn, setMappingSortColumn] = useState<string>(initialSortColumn);
    const [mappingSortDirection, setMappingSortDirection] = useState<'asc' | 'desc'>(initialSortDirection);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const limit = MAPPINGS_LIMIT;

    const fetchMappings = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: (page * limit).toString(),
                sortColumn: mappingSortColumn,
                sortDirection: mappingSortDirection,
            });
            if (debouncedSearchUrl) params.set('searchUrl', debouncedSearchUrl);
            if (debouncedSearchCategory) params.set('searchCategory', debouncedSearchCategory);

            const res = await fetch(`/api/mappings?${params}`);
            if (res.status === 401) { handleSessionExpired(); return; }
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
    }, [page, debouncedSearchUrl, debouncedSearchCategory, mappingSortColumn, mappingSortDirection, limit, handleSessionExpired]);

    const handleMappingSort = (column: string) => {
        if (mappingSortColumn === column) {
            setMappingSortDirection(mappingSortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setMappingSortColumn(column);
            setMappingSortDirection('desc');
        }
        setPage(0);
    };

    const handleEdit = (mapping: UrlMapping) => {
        setEditingId(mapping.id);
        setEditCategory(mapping.category);
    };

    const handleSaveEdit = async (id: number) => {
        setSaving(true);
        onSavingChange(true);
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
            onSavingChange(false);
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
            message: `Mark this as uninterested? This will delete ALL ads with this landing page AND all ads with this title, and update the category to "Manual Uninterested". They will never appear again.`,
            onConfirm: async () => {
                setConfirmAction(null);
                setSaving(true);
                onSavingChange(true);
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
                    onSavingChange(false);
                }
            },
        });
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setAdding(true);
        onAddingChange(true);

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
            onAddingChange(false);
        }
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setNewUrl('');
        setNewCategory('');
    };

    // Fetch mappings on mount and when dependencies change
    useEffect(() => {
        fetchMappings();
    }, [fetchMappings]);

    // Report URL params to parent for URL synchronization
    useEffect(() => {
        const params: Record<string, string> = {};
        if (page > 0) params.mappingsPage = page.toString();
        if (debouncedSearchUrl) params.searchUrl = debouncedSearchUrl;
        if (debouncedSearchCategory) params.searchCategory = debouncedSearchCategory;
        if (mappingSortColumn !== 'created_at') params.mappingsSortCol = mappingSortColumn;
        if (mappingSortDirection !== 'desc') params.mappingsSortDir = mappingSortDirection;
        onUrlParamsChange(params);
    }, [page, debouncedSearchUrl, debouncedSearchCategory, mappingSortColumn, mappingSortDirection, onUrlParamsChange]);

    // Watch refreshTrigger to refetch
    useEffect(() => {
        if (refreshTrigger > 0) {
            fetchMappings();
        }
    }, [refreshTrigger, fetchMappings]);

    return (
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
                <UrlMappingsTable
                    mappings={mappings}
                    loading={loading}
                    fetchError={fetchError}
                    mappingSortColumn={mappingSortColumn}
                    mappingSortDirection={mappingSortDirection}
                    onSort={handleMappingSort}
                    editingId={editingId}
                    editCategory={editCategory}
                    onEditCategoryChange={setEditCategory}
                    saving={saving}
                    deleting={deleting}
                    hoveredUrlId={hoveredUrlId}
                    onHoverUrl={setHoveredUrlId}
                    onEdit={handleEdit}
                    onSave={handleSaveEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onDelete={handleDelete}
                    onMarkUninterested={handleMarkMappingUninterested}
                    debouncedSearchUrl={debouncedSearchUrl}
                    debouncedSearchCategory={debouncedSearchCategory}
                />

                <Pagination
                    currentPage={page}
                    totalItems={total}
                    itemsPerPage={limit}
                    onPageChange={setPage}
                />
            </div>

            <AddMappingModal
                showModal={showAddModal}
                onClose={handleCloseModal}
                onSubmit={handleAdd}
                newUrl={newUrl}
                onNewUrlChange={setNewUrl}
                newCategory={newCategory}
                onNewCategoryChange={setNewCategory}
                adding={adding}
            />
        </>
    );
}
