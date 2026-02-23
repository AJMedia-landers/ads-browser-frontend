'use client';

interface AddTitleMappingModalProps {
    showModal: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    newTitle: string;
    onNewTitleChange: (value: string) => void;
    newTitleCategory: string;
    onNewTitleCategoryChange: (value: string) => void;
    adding: boolean;
}

export default function AddTitleMappingModal({
    showModal,
    onClose,
    onSubmit,
    newTitle,
    onNewTitleChange,
    newTitleCategory,
    onNewTitleCategoryChange,
    adding,
}: AddTitleMappingModalProps) {
    if (!showModal) return null;

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h2>Add New Title Mapping</h2>
                    <button className="close-icon" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={onSubmit} className="modal-form">
                    <div className="form-group">
                        <label htmlFor="newTitle">Title</label>
                        <input
                            id="newTitle"
                            type="text"
                            value={newTitle}
                            onChange={(e) => onNewTitleChange(e.target.value)}
                            required
                            placeholder="Ad title text"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="newTitleCategory">Category</label>
                        <input
                            id="newTitleCategory"
                            type="text"
                            value={newTitleCategory}
                            onChange={(e) => onNewTitleCategoryChange(e.target.value)}
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
                            {adding ? 'Adding...' : 'Add Title Mapping'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
