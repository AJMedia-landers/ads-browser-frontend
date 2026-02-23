'use client';

import { TitleMapping } from '@/app/lib/types';
import { highlightMatch } from '@/app/lib/utils';

interface TitleMappingsTableProps {
    titleMappings: TitleMapping[];
    loading: boolean;
    fetchError: string | null;
    titleSortColumn: string;
    titleSortDirection: 'asc' | 'desc';
    onSort: (column: string) => void;
    editingTitleId: number | null;
    editTitleCategory: string;
    onEditTitleCategoryChange: (value: string) => void;
    savingTitle: boolean;
    deletingTitle: number | null;
    onEdit: (mapping: TitleMapping) => void;
    onSave: (id: number) => void;
    onCancelEdit: () => void;
    onDelete: (id: number) => void;
    debouncedSearchTitle: string;
    debouncedSearchCategory: string;
}

export default function TitleMappingsTable({
    titleMappings,
    loading,
    fetchError,
    titleSortColumn,
    titleSortDirection,
    onSort,
    editingTitleId,
    editTitleCategory,
    onEditTitleCategoryChange,
    savingTitle,
    deletingTitle,
    onEdit,
    onSave,
    onCancelEdit,
    onDelete,
    debouncedSearchTitle,
    debouncedSearchCategory,
}: TitleMappingsTableProps) {
    return (
        <table className="data-table">
            <thead>
                <tr>
                    <th className="sortable-header" onClick={() => onSort('id')}>
                        ID {titleSortColumn === 'id' && (titleSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="sortable-header" onClick={() => onSort('title')}>
                        Title {titleSortColumn === 'title' && (titleSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="sortable-header" onClick={() => onSort('category')}>
                        Category {titleSortColumn === 'category' && (titleSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Translated Title</th>
                    <th className="sortable-header" onClick={() => onSort('created_at')}>
                        Created {titleSortColumn === 'created_at' && (titleSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {loading ? (
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
                                {highlightMatch(mapping.title, debouncedSearchTitle)}
                            </td>
                            <td className="category-cell">
                                {editingTitleId === mapping.id ? (
                                    <input
                                        type="text"
                                        value={editTitleCategory}
                                        onChange={(e) => onEditTitleCategoryChange(e.target.value)}
                                        className="edit-input"
                                        list="categories"
                                    />
                                ) : (
                                    <span className="category-badge">
                                        {highlightMatch(mapping.category || '', debouncedSearchCategory)}
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
                                            onClick={() => onSave(mapping.id)}
                                            className="action-btn save-btn"
                                            disabled={savingTitle}
                                        >
                                            {savingTitle ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={onCancelEdit}
                                            className="action-btn cancel-btn"
                                            disabled={savingTitle}
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => onEdit(mapping)}
                                            className="action-btn edit-btn"
                                            disabled={deletingTitle === mapping.id}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDelete(mapping.id)}
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
    );
}
