import { startResearch } from '@/lib/research';


const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return Response.json({ error: 'Client not found' }, { status: 404 });
  try {
    await startResearch(id);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m === 'research running') return Response.json({ error: 'Research is already running for this client' }, { status: 409 });
    if (m === 'client not found') return Response.json({ error: 'Client not found' }, { status: 404 });
    throw e;
  }
  return Response.json({}, { status: 202 });
}
