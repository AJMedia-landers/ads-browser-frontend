import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_BASE_URL!;

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        const res = await fetch(`${API}/api/url-mapping/title-mappings/conflicts`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Error fetching conflicts:', error);
        return NextResponse.json({ error: 'Failed to fetch conflicts' }, { status: 500 });
    }
}
