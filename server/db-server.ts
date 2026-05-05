import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import Database from 'better-sqlite3';
import { Hono } from 'hono';

const DB_PATH = process.env.DB_PATH ?? 'gridman.db';

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS project_configs (
    project_path TEXT PRIMARY KEY,
    config       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS table_rows (
    project_path TEXT    NOT NULL,
    table_name   TEXT    NOT NULL,
    row_id       TEXT    NOT NULL,
    row_order    REAL    NOT NULL,
    data         TEXT    NOT NULL,
    PRIMARY KEY (project_path, table_name, row_id)
  );

  CREATE TABLE IF NOT EXISTS schemas (
    project_path TEXT NOT NULL,
    table_name   TEXT NOT NULL,
    schema       TEXT NOT NULL,
    PRIMARY KEY (project_path, table_name)
  );

  CREATE TABLE IF NOT EXISTS page_templates (
    project_path TEXT NOT NULL,
    name         TEXT NOT NULL,
    template     TEXT NOT NULL,
    PRIMARY KEY (project_path, name)
  );
`);

const app = new Hono();

app.get('/api/project', (c) => {
  const projectPath = c.req.query('path');
  if (!projectPath) return c.json({ error: 'path required' }, 400);
  const row = db
    .prepare('SELECT config FROM project_configs WHERE project_path = ?')
    .get(projectPath) as { config: string } | undefined;
  if (!row) return c.json({ error: 'project not found' }, 404);
  return c.json(JSON.parse(row.config));
});

app.put('/api/project', async (c) => {
  const projectPath = c.req.query('path');
  if (!projectPath) return c.json({ error: 'path required' }, 400);
  const config = await c.req.json();
  db.prepare(
    'INSERT INTO project_configs (project_path, config) VALUES (?, ?) ON CONFLICT(project_path) DO UPDATE SET config = excluded.config'
  ).run(projectPath, JSON.stringify(config));
  return c.json({ ok: true });
});

app.get('/api/tables/:name', (c) => {
  const projectPath = c.req.query('project');
  if (!projectPath) return c.json({ error: 'project required' }, 400);
  const name = c.req.param('name');
  const rows = db
    .prepare(
      'SELECT data FROM table_rows WHERE project_path = ? AND table_name = ? ORDER BY row_order'
    )
    .all(projectPath, name) as { data: string }[];
  return c.json(rows.map((r) => JSON.parse(r.data)));
});

app.put('/api/tables/:name', async (c) => {
  const projectPath = c.req.query('project');
  if (!projectPath) return c.json({ error: 'project required' }, 400);
  const name = c.req.param('name');
  const rows: Record<string, unknown>[] = await c.req.json();
  const upsert = db.prepare(
    'INSERT INTO table_rows (project_path, table_name, row_id, row_order, data) VALUES (?, ?, ?, ?, ?) ON CONFLICT(project_path, table_name, row_id) DO UPDATE SET row_order = excluded.row_order, data = excluded.data'
  );
  const deleteOthers = db.prepare(
    'DELETE FROM table_rows WHERE project_path = ? AND table_name = ? AND row_id NOT IN (SELECT value FROM json_each(?))'
  );
  db.transaction(() => {
    for (const row of rows) {
      upsert.run(projectPath, name, row._id as string, row._order as number, JSON.stringify(row));
    }
    const ids = JSON.stringify(rows.map((r) => r._id));
    deleteOthers.run(projectPath, name, ids);
  })();
  return c.json({ ok: true });
});

app.patch('/api/tables/:name', async (c) => {
  const projectPath = c.req.query('project');
  if (!projectPath) return c.json({ error: 'project required' }, 400);
  const name = c.req.param('name');
  const updated: Record<string, unknown>[] = await c.req.json();
  const upsert = db.prepare(
    'INSERT INTO table_rows (project_path, table_name, row_id, row_order, data) VALUES (?, ?, ?, ?, ?) ON CONFLICT(project_path, table_name, row_id) DO UPDATE SET row_order = excluded.row_order, data = excluded.data'
  );
  db.transaction(() => {
    for (const row of updated) {
      upsert.run(projectPath, name, row._id as string, row._order as number, JSON.stringify(row));
    }
  })();
  return c.json({ ok: true });
});

app.get('/api/schemas/:name', (c) => {
  const projectPath = c.req.query('project');
  if (!projectPath) return c.json({ error: 'project required' }, 400);
  const name = c.req.param('name');
  const row = db
    .prepare('SELECT schema FROM schemas WHERE project_path = ? AND table_name = ?')
    .get(projectPath, name) as { schema: string } | undefined;
  if (!row) return c.json({ error: 'schema not found' }, 404);
  return c.json(JSON.parse(row.schema));
});

app.put('/api/schemas/:name', async (c) => {
  const projectPath = c.req.query('project');
  if (!projectPath) return c.json({ error: 'project required' }, 400);
  const name = c.req.param('name');
  const schema = await c.req.json();
  db.prepare(
    'INSERT INTO schemas (project_path, table_name, schema) VALUES (?, ?, ?) ON CONFLICT(project_path, table_name) DO UPDATE SET schema = excluded.schema'
  ).run(projectPath, name, JSON.stringify(schema));
  return c.json({ ok: true });
});

app.get('/api/page-templates', (c) => {
  const projectPath = c.req.query('project');
  if (!projectPath) return c.json({ error: 'project required' }, 400);
  const rows = db
    .prepare('SELECT name FROM page_templates WHERE project_path = ?')
    .all(projectPath) as { name: string }[];
  return c.json(rows.map((r) => r.name));
});

app.get('/api/page-templates/:name', (c) => {
  const projectPath = c.req.query('project');
  if (!projectPath) return c.json({ error: 'project required' }, 400);
  const name = c.req.param('name');
  const row = db
    .prepare('SELECT template FROM page_templates WHERE project_path = ? AND name = ?')
    .get(projectPath, name) as { template: string } | undefined;
  if (!row) return c.json({ error: 'page template not found' }, 404);
  return c.json(JSON.parse(row.template));
});

app.put('/api/page-templates/:name', async (c) => {
  const projectPath = c.req.query('project');
  if (!projectPath) return c.json({ error: 'project required' }, 400);
  const name = c.req.param('name');
  const template = await c.req.json();
  db.prepare(
    'INSERT INTO page_templates (project_path, name, template) VALUES (?, ?, ?) ON CONFLICT(project_path, name) DO UPDATE SET template = excluded.template'
  ).run(projectPath, name, JSON.stringify(template));
  return c.json({ ok: true });
});

app.delete('/api/page-templates/:name', (c) => {
  const projectPath = c.req.query('project');
  if (!projectPath) return c.json({ error: 'project required' }, 400);
  const name = c.req.param('name');
  db.prepare('DELETE FROM page_templates WHERE project_path = ? AND name = ?').run(
    projectPath,
    name
  );
  return c.json({ ok: true });
});

app.use('*', serveStatic({ root: './dist' }));
app.get('*', async (c) => {
  try {
    const html = await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf-8');
    return c.html(html);
  } catch {
    return c.text('SPA not built. Run `npm run build` first.', 503);
  }
});

const PORT = Number(process.env.PORT ?? 8082);
serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`DB Server: http://localhost:${info.port} (DB: ${DB_PATH})`);
});
