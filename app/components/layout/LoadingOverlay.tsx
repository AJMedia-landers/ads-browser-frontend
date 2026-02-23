'use client';

interface LoadingOverlayProps {
    saving: boolean;
    adding: boolean;
    savingAd: boolean;
    merging: boolean;
    savingTitle: boolean;
    addingTitle: boolean;
}

export default function LoadingOverlay({ saving, adding, savingAd, merging, savingTitle, addingTitle }: LoadingOverlayProps) {
    const isVisible = saving || adding || savingAd || merging || savingTitle || addingTitle;
    if (!isVisible) return null;

    const message = saving ? 'Updating records...'
        : adding ? 'Creating mapping...'
        : merging ? 'Merging categories...'
        : savingTitle ? 'Updating title mapping...'
        : addingTitle ? 'Creating title mapping...'
        : 'Updating ad category...';

    return (
        <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>{message}</p>
        </div>
    );
}
