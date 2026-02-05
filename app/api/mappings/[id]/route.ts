import { NextRequest, NextResponse } from 'next/server';
import { getMappingById, updateMapping, deleteMapping } from '@/lib/db';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const mapping = await getMappingById(parseInt(id));

        if (!mapping) {
            return NextResponse.json(
                { error: 'Mapping not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(mapping);
    } catch (error) {
        console.error('Error fetching mapping:', error);
        return NextResponse.json(
            { error: 'Failed to fetch mapping' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { category } = body;

        if (!category) {
            return NextResponse.json(
                { error: 'category is required' },
                { status: 400 }
            );
        }

        const { mapping, stagingRowsUpdated } = await updateMapping(parseInt(id), category);

        if (!mapping) {
            return NextResponse.json(
                { error: 'Mapping not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ ...mapping, stagingRowsUpdated });
    } catch (error) {
        console.error('Error updating mapping:', error);
        return NextResponse.json(
            { error: 'Failed to update mapping' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const deleted = await deleteMapping(parseInt(id));

        if (!deleted) {
            return NextResponse.json(
                { error: 'Mapping not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting mapping:', error);
        return NextResponse.json(
            { error: 'Failed to delete mapping' },
            { status: 500 }
        );
    }
}
