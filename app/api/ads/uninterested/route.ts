import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_BASE_URL!;

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        const body = await request.json();

        const res = await fetch(`${API}/api/url-mapping/ads/uninterested`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Failed to mark ad as uninterested:', error);
        return NextResponse.json({ error: 'Failed to mark ad as uninterested' }, { status: 500 });
    }
}
