import { NextResponse } from 'next/server';
import { sharedFate } from '@/queries/sharedFate';
import { singlePointsOfFailure } from '@/queries/singlePointsOfFailure';
import { toApiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [sharedFateFindings, spofs] = await Promise.all([
      sharedFate(),
      singlePointsOfFailure(),
    ]);
    return NextResponse.json({ ok: true, data: { sharedFateFindings, spofs } });
  } catch (err) {
    const error = toApiError(err);
    const status = error.code === 'DB_UNREACHABLE' ? 503 : 500;
    return NextResponse.json({ ok: false, error }, { status });
  }
}
