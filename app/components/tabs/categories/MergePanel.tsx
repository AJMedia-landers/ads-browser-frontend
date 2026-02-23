'use client';

interface MergePanelProps {
    selectedSourceCategories: Set<string>;
    onRemoveSource: (category: string) => void;
    mergeTarget: string;
    onMergeTargetChange: (value: string) => void;
    onMerge: () => void;
    merging: boolean;
}

export default function MergePanel({
    selectedSourceCategories,
    onRemoveSource,
    mergeTarget,
    onMergeTargetChange,
    onMerge,
    merging,
}: MergePanelProps) {
    return (
        <div className="dedup-merge-panel">
            {selectedSourceCategories.size > 0 ? (
                <>
                    <h3>Merge {selectedSourceCategories.size} Categor{selectedSourceCategories.size === 1 ? 'y' : 'ies'}</h3>
                    <div className="dedup-merge-source">
                        <label>Sources (will be renamed)</label>
                        <div className="dedup-source-list">
                            {Array.from(selectedSourceCategories).map(src => (
                                <div key={src} className="dedup-source-value">
                                    {src}
                                    <button
                                        className="dedup-source-remove"
                                        onClick={() => onRemoveSource(src)}
                                        title="Remove"
                                    >&times;</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="dedup-merge-target">
                        <label htmlFor="merge-target">Target (new name)</label>
                        <input
                            id="merge-target"
                            type="text"
                            value={mergeTarget}
                            onChange={(e) => onMergeTargetChange(e.target.value)}
                            placeholder="Type or select target category..."
                            list="all-categories-list"
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={onMerge}
                        disabled={!mergeTarget.trim() || merging}
                    >
                        {merging ? 'Merging...' : `Merge ${selectedSourceCategories.size} \u2192 ${mergeTarget.trim() || '...'}`}
                    </button>
                </>
            ) : (
                <div className="dedup-merge-empty">
                    Click categories from the list to select them for merging. You can select multiple.
                </div>
            )}
        </div>
    );
}
