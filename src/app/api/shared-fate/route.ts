import { NextResponse } from 'next/server';
import { sharedFate } from '@/queries/sharedFate';
import { toApiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await sharedFate();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const error = toApiError(err);
    const status = error.code === 'DB_UNREACHABLE' ? 503 : 500;
    return NextResponse.json({ ok: false, error }, { status });
  }
}
