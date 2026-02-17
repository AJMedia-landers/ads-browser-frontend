import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_BASE_URL!;

export async function POST(_request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        const res = await fetch(`${API}/api/url-mapping/categories/normalise`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Failed to start normalisation:', error);
        return NextResponse.json({ error: 'Failed to start normalisation' }, { status: 500 });
    }
}
