export interface UrlMapping {
    id: number;
    cleaned_url: string;
    category: string;
    created_at: string;
}

export interface TitleMapping {
    id: number;
    title: string;
    category: string;
    translated_title: string;
    created_at: string;
    updated_at: string;
}

export interface Ad {
    id: number;
    country: string;
    date: string;
    title: string;
    ad_image_url: string;
    cdn_url: string;
    landing_page: string;
    website: string;
    location: string;
    ad_network: string;
    device: string;
    occurrences: number;
    hour_of_day: number;
    category: string;
    image_hash: string;
    type: string;
    url_count: number;
    category_count: number;
    title_count: number;
    cleaned_landing_page: string;
}

export interface CategoryWithCounts {
    category: string;
    mapping_count: number;
    ad_count: number;
    title_mapping_count: number;
}

export type TabType = 'ads' | 'mappings' | 'titles' | 'categories';

export interface ConfirmActionState {
    message: string;
    onConfirm: () => void;
}
