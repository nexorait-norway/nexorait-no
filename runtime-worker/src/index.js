export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runBatch(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return new Response("nexorait-runtime", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    if (request.method === "POST" && url.pathname === "/tick") {
      const taken = await runBatch(env);
      return new Response(JSON.stringify({ ok: true, taken }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    return new Response("Not found", { status: 404 });
  },
};

async function runBatch(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      status TEXT NOT NULL,
      title TEXT,
      payload_json TEXT,
      run_at TEXT,
      error TEXT,
      created_at TEXT,
      finished_at TEXT
    )`
  ).run();

  const ready = await env.DB.prepare(
    "SELECT id FROM tasks WHERE status = 'READY' ORDER BY id LIMIT 5"
  ).all();
  const rows = ready.results || [];
  const now = new Date().toISOString();
  for (const row of rows) {
    await env.DB.prepare(
      "UPDATE tasks SET status = 'DONE', finished_at = ?, error = NULL WHERE id = ? AND status = 'READY'"
    )
      .bind(now, row.id)
      .run();
  }
  return rows.length;
}
