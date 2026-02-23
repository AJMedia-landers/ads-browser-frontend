'use client';

import { UrlMapping } from '@/app/lib/types';
import { highlightMatch } from '@/app/lib/utils';

interface UrlMappingsTableProps {
    mappings: UrlMapping[];
    loading: boolean;
    fetchError: string | null;
    mappingSortColumn: string;
    mappingSortDirection: 'asc' | 'desc';
    onSort: (column: string) => void;
    editingId: number | null;
    editCategory: string;
    onEditCategoryChange: (value: string) => void;
    saving: boolean;
    deleting: number | null;
    hoveredUrlId: number | null;
    onHoverUrl: (id: number | null) => void;
    onEdit: (mapping: UrlMapping) => void;
    onSave: (id: number) => void;
    onCancelEdit: () => void;
    onDelete: (id: number) => void;
    onMarkUninterested: (mapping: UrlMapping) => void;
    debouncedSearchUrl: string;
    debouncedSearchCategory: string;
}

export default function UrlMappingsTable({
    mappings,
    loading,
    fetchError,
    mappingSortColumn,
    mappingSortDirection,
    onSort,
    editingId,
    editCategory,
    onEditCategoryChange,
    saving,
    deleting,
    hoveredUrlId,
    onHoverUrl,
    onEdit,
    onSave,
    onCancelEdit,
    onDelete,
    onMarkUninterested,
    debouncedSearchUrl,
    debouncedSearchCategory,
}: UrlMappingsTableProps) {
    return (
        <table className="data-table">
            <thead>
                <tr>
                    <th className="sortable-header" onClick={() => onSort('id')}>
                        ID {mappingSortColumn === 'id' && (mappingSortDirection === 'asc' ? '\u2191' : '\u2193')}
                    </th>
                    <th className="sortable-header" onClick={() => onSort('cleaned_url')}>
                        Cleaned URL {mappingSortColumn === 'cleaned_url' && (mappingSortDirection === 'asc' ? '\u2191' : '\u2193')}
                    </th>
                    <th className="sortable-header" onClick={() => onSort('category')}>
                        Category {mappingSortColumn === 'category' && (mappingSortDirection === 'asc' ? '\u2191' : '\u2193')}
                    </th>
                    <th className="sortable-header" onClick={() => onSort('created_at')}>
                        Created {mappingSortColumn === 'created_at' && (mappingSortDirection === 'asc' ? '\u2191' : '\u2193')}
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
                                onMouseEnter={() => onHoverUrl(mapping.id)}
                                onMouseLeave={() => onHoverUrl(null)}
                            >
                                <div className={`url-wrapper ${hoveredUrlId === mapping.id ? 'expanded' : ''}`}>
                                    <a
                                        href={mapping.cleaned_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="url-link"
                                        title={mapping.cleaned_url}
                                    >
                                        {highlightMatch(mapping.cleaned_url, debouncedSearchUrl)}
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
                                        onChange={(e) => onEditCategoryChange(e.target.value)}
                                        className="edit-input"
                                        list="categories"
                                    />
                                ) : (
                                    <span className="category-badge">
                                        {highlightMatch(mapping.category, debouncedSearchCategory)}
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
                                            onClick={() => onSave(mapping.id)}
                                            className="action-btn save-btn"
                                            disabled={saving}
                                        >
                                            {saving ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={onCancelEdit}
                                            className="action-btn cancel-btn"
                                            disabled={saving}
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => onEdit(mapping)}
                                            className="action-btn edit-btn"
                                            disabled={deleting === mapping.id}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDelete(mapping.id)}
                                            className="action-btn delete-btn"
                                            disabled={deleting === mapping.id}
                                        >
                                            {deleting === mapping.id ? 'Deleting...' : 'Delete'}
                                        </button>
                                        <button
                                            onClick={() => onMarkUninterested(mapping)}
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
    );
}
