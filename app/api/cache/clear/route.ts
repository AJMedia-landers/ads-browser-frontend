import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_BASE_URL!;

export async function POST() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        const res = await fetch(`${API}/api/url-mapping/cache/clear`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Error clearing cache:', error);
        return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
    }
}
