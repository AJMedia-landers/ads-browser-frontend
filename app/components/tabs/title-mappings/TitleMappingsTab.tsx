'use client';

import { useState, useEffect, useCallback } from 'react';
import { TitleMapping, ConfirmActionState } from '@/app/lib/types';
import { useDebounce } from '@/app/hooks/useDebounce';
import { TITLE_MAPPINGS_LIMIT, DEBOUNCE_DELAY } from '@/app/lib/constants';
import Pagination from '@/app/components/shared/Pagination';
import TitleMappingsTable from './TitleMappingsTable';
import AddTitleMappingModal from './AddTitleMappingModal';

interface TitleMappingsTabProps {
    setError: (msg: string) => void;
    setSuccess: (msg: string) => void;
    setConfirmAction: (action: { message: string; onConfirm: () => void } | null) => void;
    setInfoModal: (topic: string | null) => void;
    handleSessionExpired: () => void;
    fetchCategories: () => void;
    refreshTrigger: number;
    onSavingTitleChange: (saving: boolean) => void;
    onAddingTitleChange: (adding: boolean) => void;
    onUrlParamsChange: (params: Record<string, string>) => void;
    initialPage: number;
}

export default function TitleMappingsTab({
    setError,
    setSuccess,
    setConfirmAction,
    setInfoModal,
    handleSessionExpired,
    fetchCategories,
    refreshTrigger,
    onSavingTitleChange,
    onAddingTitleChange,
    onUrlParamsChange,
    initialPage,
}: TitleMappingsTabProps) {
    const [titleMappings, setTitleMappings] = useState<TitleMapping[]>([]);
    const [titleMappingsTotal, setTitleMappingsTotal] = useState(0);
    const [titleMappingsPage, setTitleMappingsPage] = useState(initialPage);
    const [titleMappingsLoading, setTitleMappingsLoading] = useState(false);
    const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
    const [editTitleCategory, setEditTitleCategory] = useState('');
    const [titleSearchTitle, setTitleSearchTitle] = useState('');
    const [titleSearchCategory, setTitleSearchCategory] = useState('');
    const debouncedTitleSearchTitle = useDebounce(titleSearchTitle, DEBOUNCE_DELAY);
    const debouncedTitleSearchCategory = useDebounce(titleSearchCategory, DEBOUNCE_DELAY);
    const [titleSortColumn, setTitleSortColumn] = useState<string>('created_at');
    const [titleSortDirection, setTitleSortDirection] = useState<'asc' | 'desc'>('desc');
    const [showAddTitleModal, setShowAddTitleModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newTitleCategory, setNewTitleCategory] = useState('');
    const [savingTitle, setSavingTitle] = useState(false);
    const [deletingTitle, setDeletingTitle] = useState<number | null>(null);
    const [addingTitle, setAddingTitle] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const titleLimit = TITLE_MAPPINGS_LIMIT;

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
            if (res.status === 401) { handleSessionExpired(); return; }
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
        onSavingTitleChange(true);
        setError('');
        try {
            const res = await fetch(`/api/title-mappings/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: editTitleCategory }),
            });

            if (!res.ok) throw new Error('Failed to update');

            const data = await res.json();
            setEditingTitleId(null);
            const adsMsg = data.adsUpdated ? ` ${data.adsUpdated} ads updated.` : '';
            setSuccess(`Title mapping updated.${adsMsg}`);

            fetchTitleMappings();
            fetchCategories();
        } catch {
            setError('Failed to update title mapping');
        } finally {
            setSavingTitle(false);
            onSavingTitleChange(false);
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
        onAddingTitleChange(true);

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
            const adsMsg = data.adsUpdated ? ` ${data.adsUpdated} ads updated.` : '';
            setSuccess(`Title mapping created.${adsMsg}`);

            fetchTitleMappings();
            fetchCategories();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create title mapping');
        } finally {
            setAddingTitle(false);
            onAddingTitleChange(false);
        }
    };

    const handleCloseAddModal = () => {
        setShowAddTitleModal(false);
        setNewTitle('');
        setNewTitleCategory('');
    };

    // Fetch on mount and when dependencies change
    useEffect(() => {
        fetchTitleMappings();
    }, [fetchTitleMappings]);

    // Report URL params when page/search/sort change
    useEffect(() => {
        const params: Record<string, string> = {};
        if (titleMappingsPage > 0) params.titlesPage = titleMappingsPage.toString();
        if (debouncedTitleSearchTitle) params.titleSearchTitle = debouncedTitleSearchTitle;
        if (debouncedTitleSearchCategory) params.titleSearchCategory = debouncedTitleSearchCategory;
        if (titleSortColumn !== 'created_at') params.titleSortCol = titleSortColumn;
        if (titleSortDirection !== 'desc') params.titleSortDir = titleSortDirection;
        onUrlParamsChange(params);
    }, [titleMappingsPage, debouncedTitleSearchTitle, debouncedTitleSearchCategory, titleSortColumn, titleSortDirection, onUrlParamsChange]);

    // Watch refreshTrigger to refetch
    useEffect(() => {
        if (refreshTrigger > 0) {
            fetchTitleMappings();
        }
    }, [refreshTrigger]);

    return (
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
                <TitleMappingsTable
                    titleMappings={titleMappings}
                    loading={titleMappingsLoading}
                    fetchError={fetchError}
                    titleSortColumn={titleSortColumn}
                    titleSortDirection={titleSortDirection}
                    onSort={handleTitleMappingSort}
                    editingTitleId={editingTitleId}
                    editTitleCategory={editTitleCategory}
                    onEditTitleCategoryChange={setEditTitleCategory}
                    savingTitle={savingTitle}
                    deletingTitle={deletingTitle}
                    onEdit={handleEditTitleMapping}
                    onSave={handleSaveTitleEdit}
                    onCancelEdit={() => setEditingTitleId(null)}
                    onDelete={handleDeleteTitleMapping}
                    debouncedSearchTitle={debouncedTitleSearchTitle}
                    debouncedSearchCategory={debouncedTitleSearchCategory}
                />

                <Pagination
                    currentPage={titleMappingsPage}
                    totalItems={titleMappingsTotal}
                    itemsPerPage={titleLimit}
                    onPageChange={setTitleMappingsPage}
                />
            </div>

            <AddTitleMappingModal
                showModal={showAddTitleModal}
                onClose={handleCloseAddModal}
                onSubmit={handleAddTitleMapping}
                newTitle={newTitle}
                onNewTitleChange={setNewTitle}
                newTitleCategory={newTitleCategory}
                onNewTitleCategoryChange={setNewTitleCategory}
                adding={addingTitle}
            />
        </>
    );
}
