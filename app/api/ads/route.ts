import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_BASE_URL!;

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        const searchParams = request.nextUrl.searchParams;

        const res = await fetch(`${API}/api/url-mapping/ads?${searchParams}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Failed to fetch ads:', error);
        return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 });
    }
}
