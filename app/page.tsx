'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UrlMapping {
    id: number;
    cleaned_url: string;
    category: string;
    created_at: string;
}

export default function Home() {
    const router = useRouter();
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

    useEffect(() => {
        fetchMappings();
    }, [fetchMappings]);

    useEffect(() => {
        fetchCategories();
    }, []);

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

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this mapping?')) return;

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
                        <span className="nav-tab active">URL Mappings</span>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </nav>

            <main className="app-content">
                <div className="admin-container">
                    <div className="admin-header">
                        <h1>URL Mapping Admin</h1>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn btn-primary"
                        >
                            Add Mapping
                        </button>
                    </div>

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
                </div>
            </main>

            {/* Loading overlay */}
            {(saving || adding) && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>{saving ? 'Updating records...' : 'Creating mapping...'}</p>
                </div>
            )}
        </div>
    );
}
