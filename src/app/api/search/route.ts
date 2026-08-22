import { NextRequest, NextResponse } from 'next/server';
import { SearchInput, search } from '@/queries/search';
import { toApiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';

  const parsed = SearchInput.safeParse({ q });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'BAD_INPUT', message: parsed.error.issues[0]?.message ?? 'Invalid input' } },
      { status: 400 },
    );
  }

  try {
    const data = await search(parsed.data);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const error = toApiError(err);
    const status = error.code === 'DB_UNREACHABLE' ? 503 : 500;
    return NextResponse.json({ ok: false, error }, { status });
  }
}
