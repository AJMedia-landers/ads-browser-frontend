'use client';

import { Ad } from '@/app/lib/types';
import { highlightMatch, cleanUrl } from '@/app/lib/utils';

interface AdsTableProps {
    ads: Ad[];
    sortColumn: string;
    sortDirection: 'asc' | 'desc';
    onSort: (column: string) => void;
    editingAdId: number | null;
    editAdCategory: string;
    savingAd: boolean;
    onEditAd: (ad: Ad) => void;
    onSaveAdCategory: (ad: Ad) => void;
    onCancelAdEdit: () => void;
    onEditAdCategoryChange: (value: string) => void;
    onMarkUninterested: (ad: Ad) => void;
    debouncedSearchCategory: string;
    debouncedSearchTitle: string;
    debouncedSearchLandingPage: string;
}

export default function AdsTable({
    ads,
    sortColumn,
    sortDirection,
    onSort,
    editingAdId,
    editAdCategory,
    savingAd,
    onEditAd,
    onSaveAdCategory,
    onCancelAdEdit,
    onEditAdCategoryChange,
    onMarkUninterested,
    debouncedSearchCategory,
    debouncedSearchTitle,
    debouncedSearchLandingPage,
}: AdsTableProps) {
    const renderSortIndicator = (column: string) => {
        if (sortColumn !== column) return null;
        return sortDirection === 'asc' ? ' \u2191' : ' \u2193';
    };

    return (
        <table className="data-table ads-table">
            <thead>
                <tr>
                    <th className="sortable" onClick={() => onSort('category')}>
                        Category{renderSortIndicator('category')}
                    </th>
                    <th className="sortable" onClick={() => onSort('title')}>
                        Title{renderSortIndicator('title')}
                    </th>
                    <th>Image</th>
                    <th className="sortable" onClick={() => onSort('landing_page')}>
                        Landing Page{renderSortIndicator('landing_page')}
                    </th>
                </tr>
            </thead>
            <tbody>
                {ads.map((ad) => (
                    <tr key={ad.id}>
                        <td className="ads-category-cell">
                            {editingAdId === ad.id ? (
                                <div className="ads-category-edit">
                                    <input
                                        type="text"
                                        value={editAdCategory}
                                        onChange={(e) => onEditAdCategoryChange(e.target.value)}
                                        className="edit-input"
                                        list="categories"
                                        autoFocus
                                    />
                                    <div className="ads-edit-actions">
                                        <button
                                            onClick={() => onSaveAdCategory(ad)}
                                            className="action-btn save-btn"
                                            disabled={savingAd}
                                        >
                                            {savingAd ? '...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={onCancelAdEdit}
                                            className="action-btn cancel-btn"
                                            disabled={savingAd}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="ads-category-display">
                                    <span
                                        className="category-badge editable"
                                        onClick={() => onEditAd(ad)}
                                        title="Click to edit category"
                                    >
                                        {highlightMatch(ad.category || 'Uncategorized', debouncedSearchCategory)}
                                    </span>
                                    <div className="ads-type-row">
                                        {ad.type && (
                                            <span className={`type-tag ${ad.type.replace('_', '-')}`}>
                                                {ad.type === 'url_mapping'
                                                    ? 'URL Mapping'
                                                    : ad.type === 'title_mapping'
                                                        ? 'Title Mapping'
                                                        : ad.type === 'ai_response'
                                                            ? 'AI Response'
                                                            : ad.type}
                                            </span>
                                        )}
                                        <button
                                            className="uninterested-btn"
                                            onClick={() => onMarkUninterested(ad)}
                                        >
                                            Uninterested
                                        </button>
                                    </div>
                                    {ad.category_count > 1 && (
                                        <span className="count-tag">
                                            {ad.category_count} ads in this category
                                        </span>
                                    )}
                                </div>
                            )}
                        </td>
                        <td className="ads-title-cell">
                            <div>{highlightMatch(ad.title || 'Untitled', debouncedSearchTitle)}</div>
                            {ad.title_count > 1 && (
                                <span className="count-tag">
                                    {ad.title_count} ads with this title
                                </span>
                            )}
                        </td>
                        <td className="ads-image-cell">
                            {ad.cdn_url || ad.ad_image_url ? (
                                <a
                                    href={ad.cdn_url || ad.ad_image_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ads-image-link"
                                >
                                    <img
                                        src={ad.cdn_url || ad.ad_image_url}
                                        alt={ad.title || 'Ad image'}
                                        className="ads-thumbnail"
                                        loading="lazy"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            target.nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                    <span className="ads-image-fallback hidden">View Image</span>
                                </a>
                            ) : (
                                <span className="no-image">No image</span>
                            )}
                        </td>
                        <td className="ads-url-cell">
                            <div
                                className="cleaned-url"
                                style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}
                            >
                                <a
                                    href={ad.landing_page}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="url-link"
                                    title={ad.landing_page}
                                >
                                    {highlightMatch(cleanUrl(ad.landing_page), debouncedSearchLandingPage)}
                                </a>
                            </div>
                            {ad.url_count > 1 && (
                                <span className="count-tag">
                                    {ad.url_count} ads with this URL
                                </span>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
