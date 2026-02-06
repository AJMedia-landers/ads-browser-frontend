import { NextResponse } from 'next/server';
import { getDistinctDates } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const country = searchParams.get('country');

        if (!country) {
            return NextResponse.json(
                { error: 'Country parameter is required' },
                { status: 400 }
            );
        }

        const dates = await getDistinctDates(country);
        return NextResponse.json(dates);
    } catch (error) {
        console.error('Failed to fetch dates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dates' },
            { status: 500 }
        );
    }
}
