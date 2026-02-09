import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_BASE_URL!;

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        const searchParams = request.nextUrl.searchParams;

        const res = await fetch(`${API}/api/url-mapping/mappings?${searchParams}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Error fetching mappings:', error);
        return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        const body = await request.json();

        const res = await fetch(`${API}/api/url-mapping/mappings`, {
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
        console.error('Error creating mapping:', error);
        return NextResponse.json({ error: 'Failed to create mapping' }, { status: 500 });
    }
}
