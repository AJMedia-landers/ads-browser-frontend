import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_BASE_URL!;

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        const searchParams = request.nextUrl.searchParams;

        const res = await fetch(`${API}/api/url-mapping/ads/export?${searchParams}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            const text = await res.text();
            return NextResponse.json({ error: text }, { status: res.status });
        }

        const buf = await res.arrayBuffer();
        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': res.headers.get('Content-Disposition') || 'attachment; filename="ads-export.xlsx"',
            },
        });
    } catch (error) {
        console.error('Failed to export ads:', error);
        return NextResponse.json({ error: 'Failed to export ads' }, { status: 500 });
    }
}
