export const dynamic = 'force-dynamic';

export function POST() {
  return Response.json({ ok: false, error: 'not_implemented' }, { status: 501 });
}
