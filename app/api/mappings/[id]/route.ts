import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_BASE_URL!;

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        const { id } = await params;

        const res = await fetch(`${API}/api/url-mapping/mappings/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Error fetching mapping:', error);
        return NextResponse.json({ error: 'Failed to fetch mapping' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        const { id } = await params;
        const body = await request.json();

        const res = await fetch(`${API}/api/url-mapping/mappings/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Error updating mapping:', error);
        return NextResponse.json({ error: 'Failed to update mapping' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        const { id } = await params;

        const res = await fetch(`${API}/api/url-mapping/mappings/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Error deleting mapping:', error);
        return NextResponse.json({ error: 'Failed to delete mapping' }, { status: 500 });
    }
}
