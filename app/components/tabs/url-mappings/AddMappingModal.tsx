'use client';

interface AddMappingModalProps {
    showModal: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    newUrl: string;
    onNewUrlChange: (value: string) => void;
    newCategory: string;
    onNewCategoryChange: (value: string) => void;
    adding: boolean;
}

export default function AddMappingModal({
    showModal,
    onClose,
    onSubmit,
    newUrl,
    onNewUrlChange,
    newCategory,
    onNewCategoryChange,
    adding,
}: AddMappingModalProps) {
    if (!showModal) return null;

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h2>Add New Mapping</h2>
                    <button className="close-icon" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={onSubmit} className="modal-form">
                    <div className="form-group">
                        <label htmlFor="newUrl">Cleaned URL</label>
                        <input
                            id="newUrl"
                            type="text"
                            value={newUrl}
                            onChange={(e) => onNewUrlChange(e.target.value)}
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
                            onChange={(e) => onNewCategoryChange(e.target.value)}
                            required
                            placeholder="Enter or select a category"
                            list="categories"
                        />
                    </div>
                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
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
    );
}
