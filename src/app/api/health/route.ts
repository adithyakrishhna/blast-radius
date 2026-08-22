import { NextResponse } from 'next/server';
import { verifyConnectivity } from '@/lib/db';
import { DbUnreachableError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { latencyMs } = await verifyConnectivity();
    return NextResponse.json({ status: 'ok', latencyMs });
  } catch (err) {
    if (err instanceof DbUnreachableError) {
      return NextResponse.json(
        { status: 'error', message: err.message },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { status: 'error', message: 'Unexpected error checking database.' },
      { status: 500 },
    );
  }
}
