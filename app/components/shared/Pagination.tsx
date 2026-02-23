'use client';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    itemLabel?: string;
}

export default function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange, itemLabel = 'results' }: PaginationProps) {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    return (
        <div className="pagination">
            <div className="pagination-info">
                Showing {totalItems === 0 ? 0 : currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, totalItems)} of {totalItems} {itemLabel}
            </div>
            <div className="pagination-controls">
                <button
                    onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="pagination-btn"
                >
                    Previous
                </button>
                <span className="pagination-page">
                    Page {currentPage + 1} of {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="pagination-btn"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
