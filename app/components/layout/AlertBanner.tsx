'use client';

interface AlertBannerProps {
    error: string;
    success: string;
    onClearError: () => void;
    onClearSuccess: () => void;
}

export default function AlertBanner({ error, success, onClearError, onClearSuccess }: AlertBannerProps) {
    return (
        <>
            {error && (
                <div className="alert alert-error">
                    {error}
                    <button onClick={onClearError} className="close-btn">
                        &times;
                    </button>
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    {success}
                    <button onClick={onClearSuccess} className="close-btn">
                        &times;
                    </button>
                </div>
            )}
        </>
    );
}
