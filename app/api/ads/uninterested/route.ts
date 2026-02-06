import { NextResponse } from 'next/server';
import { markAdUninterested } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { landingPage } = body;

        if (!landingPage) {
            return NextResponse.json(
                { error: 'Landing page is required' },
                { status: 400 }
            );
        }

        const result = await markAdUninterested(landingPage);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to mark ad as uninterested:', error);
        return NextResponse.json(
            { error: 'Failed to mark ad as uninterested' },
            { status: 500 }
        );
    }
}
