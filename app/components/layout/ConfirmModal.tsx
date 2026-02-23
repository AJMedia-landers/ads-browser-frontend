'use client';

import { ConfirmActionState } from '@/app/lib/types';

interface ConfirmModalProps {
    action: ConfirmActionState | null;
    onCancel: () => void;
}

export default function ConfirmModal({ action, onCancel }: ConfirmModalProps) {
    if (!action) return null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                <p className="confirm-message">{action.message}</p>
                <div className="confirm-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={action.onConfirm}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}
