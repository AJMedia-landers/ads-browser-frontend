'use client';

import { TabType } from '@/app/lib/types';

interface AppNavProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    onForceRefresh: () => void;
    onLogout: () => void;
    refreshing: boolean;
}

export default function AppNav({ activeTab, onTabChange, onForceRefresh, onLogout, refreshing }: AppNavProps) {
    return (
        <nav className="app-nav">
            <div className="nav-inner">
                <div className="nav-tabs">
                    <button
                        className={`nav-tab ${activeTab === 'ads' ? 'active' : ''}`}
                        onClick={() => onTabChange('ads')}
                    >
                        Ads Browser
                    </button>
                    <button
                        className={`nav-tab ${activeTab === 'mappings' ? 'active' : ''}`}
                        onClick={() => onTabChange('mappings')}
                    >
                        URL Mappings
                    </button>
                    <button
                        className={`nav-tab ${activeTab === 'titles' ? 'active' : ''}`}
                        onClick={() => onTabChange('titles')}
                    >
                        Title Mappings
                    </button>
                    <button
                        className={`nav-tab ${activeTab === 'categories' ? 'active' : ''}`}
                        onClick={() => onTabChange('categories')}
                    >
                        Categories
                    </button>
                </div>
                <div className="nav-actions">
                    <button
                        className="logout-btn"
                        onClick={onForceRefresh}
                        disabled={refreshing}
                        title="Clear server cache and reload data"
                    >
                        {refreshing ? 'Reloading...' : 'Reload Data'}
                    </button>
                    <button className="logout-btn" onClick={onLogout}>
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}
