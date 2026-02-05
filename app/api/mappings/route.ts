import { NextRequest, NextResponse } from 'next/server';
import { getAllMappings, createMapping } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('search') || undefined;
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const { mappings, total } = await getAllMappings(search, limit, offset);

        return NextResponse.json({ mappings, total });
    } catch (error) {
        console.error('Error fetching mappings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch mappings' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { cleaned_url, category } = body;

        if (!cleaned_url || !category) {
            return NextResponse.json(
                { error: 'cleaned_url and category are required' },
                { status: 400 }
            );
        }

        const { mapping, stagingRowsUpdated } = await createMapping(cleaned_url, category);
        return NextResponse.json({ ...mapping, stagingRowsUpdated }, { status: 201 });
    } catch (error: unknown) {
        console.error('Error creating mapping:', error);
        if (error instanceof Error && error.message.includes('duplicate key')) {
            return NextResponse.json(
                { error: 'A mapping for this URL already exists' },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to create mapping' },
            { status: 500 }
        );
    }
}
