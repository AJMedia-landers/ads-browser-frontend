import { NextResponse } from 'next/server';
import { updateAdCategoryByLandingPage } from '@/lib/db';

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { landingPage, category } = body;

        if (!landingPage || !category) {
            return NextResponse.json(
                { error: 'Landing page and category are required' },
                { status: 400 }
            );
        }

        const result = await updateAdCategoryByLandingPage(landingPage, category);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to update ad category:', error);
        return NextResponse.json(
            { error: 'Failed to update ad category' },
            { status: 500 }
        );
    }
}
