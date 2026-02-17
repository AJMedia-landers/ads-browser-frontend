import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_BASE_URL!;

export async function PUT(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        const body = await request.json();
        const { landingPage, category, title } = body;

        // 1. Update ads by URL (creates URL mapping + title mappings for matched ads)
        const res = await fetch(`${API}/api/url-mapping/ads/category`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ landingPage, category }),
        });

        const data = await res.json();
        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        let titleAdsUpdated = 0;

        // 2. If title provided, also update historical ads that match this title
        //    but weren't already categorised by a URL mapping (URL takes precedence)
        if (title && title.trim()) {
            try {
                const titleUpdateRes = await fetch(`${API}/api/url-mapping/ads/category-by-title`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ title, category }),
                });
                if (titleUpdateRes.ok) {
                    const titleData = await titleUpdateRes.json();
                    titleAdsUpdated = titleData.rowsUpdated || 0;
                }
            } catch {
                // Title update is best-effort
            }
        }

        return NextResponse.json({
            ...data,
            titleAdsUpdated,
        }, { status: 200 });
    } catch (error) {
        console.error('Failed to update ad category:', error);
        return NextResponse.json({ error: 'Failed to update ad category' }, { status: 500 });
    }
}
