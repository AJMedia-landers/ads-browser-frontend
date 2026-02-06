import { NextResponse } from 'next/server';
import { getAdsByCountryAndDate } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const country = searchParams.get('country');
        const date = searchParams.get('date');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const uniqueUrls = searchParams.get('uniqueUrls') === 'true';
        const emptyCategory = searchParams.get('emptyCategory') === 'true';
        const sortColumn = searchParams.get('sortColumn') || 'id';
        const sortDirection = searchParams.get('sortDirection') || 'desc';

        if (!country || !date) {
            return NextResponse.json(
                { error: 'Country and date parameters are required' },
                { status: 400 }
            );
        }

        const filters = { uniqueUrls, emptyCategory };
        const sort = { column: sortColumn, direction: sortDirection as 'asc' | 'desc' };
        const result = await getAdsByCountryAndDate(country, date, limit, offset, filters, sort);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to fetch ads:', error);
        return NextResponse.json(
            { error: 'Failed to fetch ads' },
            { status: 500 }
        );
    }
}
