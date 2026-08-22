import { NextRequest, NextResponse } from 'next/server';
import { BlastRadiusInput, blastRadius } from '@/queries/blastRadius';
import { businessImpact } from '@/queries/businessImpact';
import { toApiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const raw = {
    id: params.get('id') ?? '',
    maxHops: Number(params.get('maxHops') ?? 4),
    criticalities: params.getAll('criticality').length > 0
      ? params.getAll('criticality')
      : ['hard', 'soft'],
  };

  const parsed = BlastRadiusInput.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'BAD_INPUT', message: parsed.error.issues[0]?.message ?? 'Invalid input' } },
      { status: 400 },
    );
  }

  try {
    const [affected, impact] = await Promise.all([
      blastRadius(parsed.data),
      businessImpact({ id: parsed.data.id, maxHops: parsed.data.maxHops }),
    ]);
    return NextResponse.json({ ok: true, data: { affected, impact } });
  } catch (err) {
    const error = toApiError(err);
    const status = error.code === 'DB_UNREACHABLE' ? 503 : 500;
    return NextResponse.json({ ok: false, error }, { status });
  }
}
