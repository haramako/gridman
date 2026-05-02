import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const app = new Hono()

// project.json は {path}/project.json または {path}/.spreadsheet/project.json を試す
async function readProjectConfig(projectPath: string): Promise<string> {
  try {
    return await readFile(join(projectPath, 'project.json'), 'utf-8')
  } catch {
    return await readFile(join(projectPath, '.spreadsheet', 'project.json'), 'utf-8')
  }
}

async function writeProjectConfig(projectPath: string, content: string): Promise<void> {
  try {
    // まず project.json を試す
    await readFile(join(projectPath, 'project.json'), 'utf-8')
    await writeFile(join(projectPath, 'project.json'), content, 'utf-8')
  } catch {
    const dir = join(projectPath, '.spreadsheet')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'project.json'), content, 'utf-8')
  }
}

app.get('/api/project', async (c) => {
  const projectPath = c.req.query('path')
  if (!projectPath) return c.json({ error: 'path required' }, 400)
  try {
    const content = await readProjectConfig(projectPath)
    return c.json(JSON.parse(content))
  } catch {
    return c.json({ error: 'project not found' }, 404)
  }
})

app.put('/api/project', async (c) => {
  const projectPath = c.req.query('path')
  if (!projectPath) return c.json({ error: 'path required' }, 400)
  const config = await c.req.json()
  await writeProjectConfig(projectPath, JSON.stringify(config, null, 2))
  return c.json({ ok: true })
})

app.get('/api/tables/:name', async (c) => {
  const projectPath = c.req.query('project')
  if (!projectPath) return c.json({ error: 'project required' }, 400)
  const name = c.req.param('name')
  try {
    const content = await readFile(join(projectPath, `${name}.jsonl`), 'utf-8')
    const rows = content
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l))
    return c.json(rows)
  } catch {
    return c.json([])
  }
})

app.put('/api/tables/:name', async (c) => {
  const projectPath = c.req.query('project')
  if (!projectPath) return c.json({ error: 'project required' }, 400)
  const name = c.req.param('name')
  const rows: Record<string, unknown>[] = await c.req.json()
  const content = rows.map((r) => JSON.stringify(r)).join('\n') + '\n'
  await writeFile(join(projectPath, `${name}.jsonl`), content, 'utf-8')
  return c.json({ ok: true })
})

app.patch('/api/tables/:name', async (c) => {
  const projectPath = c.req.query('project')
  if (!projectPath) return c.json({ error: 'project required' }, 400)
  const name = c.req.param('name')
  const filePath = join(projectPath, `${name}.jsonl`)
  const updated: Record<string, unknown>[] = await c.req.json()

  let existing: Record<string, unknown>[] = []
  try {
    const content = await readFile(filePath, 'utf-8')
    existing = content
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l))
  } catch { /* 新規ファイル */ }

  const updatedMap = new Map(updated.map((r) => [r._id as string, r]))
  const existingIds = new Set(existing.map((r) => r._id as string))

  const merged = existing.map((r) => updatedMap.get(r._id as string) ?? r)
  for (const row of updated) {
    if (!existingIds.has(row._id as string)) merged.push(row)
  }
  merged.sort((a, b) => (a._order as number) - (b._order as number))

  const content = merged.map((r) => JSON.stringify(r)).join('\n') + '\n'
  await writeFile(filePath, content, 'utf-8')
  return c.json({ ok: true })
})

app.get('/api/schemas/:name', async (c) => {
  const projectPath = c.req.query('project')
  if (!projectPath) return c.json({ error: 'project required' }, 400)
  const name = c.req.param('name')
  try {
    const content = await readFile(join(projectPath, `${name}.schema.json`), 'utf-8')
    return c.json(JSON.parse(content))
  } catch {
    return c.json({ error: 'schema not found' }, 404)
  }
})

app.use('*', serveStatic({ root: './dist' }))
app.get('*', async (c) => {
  try {
    const html = await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf-8')
    return c.html(html)
  } catch {
    return c.text('SPA not built. Run `npm run build` first.', 503)
  }
})

const PORT = Number(process.env.PORT ?? 8080)
serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Server: http://localhost:${info.port}`)
})
