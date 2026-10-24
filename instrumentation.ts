// Runs once per server start (Next instrumentation). On the Node.js runtime only: recovers work orphaned by the
// previous server process, then starts the schedule checker.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const g = globalThis as { needoraBooted?: boolean };
    if (!g.needoraBooted) {
      g.needoraBooted = true;
      // ponytail: assumes one server process per database; anything 'running' from before this process is orphaned.
      const bootedAt = new Date(Date.now() - process.uptime() * 1000);
      const { sql } = await import('./lib/db');
      const { recoverResearch } = await import('./lib/research');
      await sql`update runs set status = 'failed', error = 'Interrupted: the server restarted mid run', finished_at = now()
        where status = 'running' and started_at < ${bootedAt.toISOString()}`.catch((e) => console.error('[boot] run recovery failed:', e));
      await recoverResearch(bootedAt).catch((e) => console.error('[boot] research recovery failed:', e));
    }
    const { startScheduler } = await import('./lib/scheduler');
    startScheduler();
  }
}
