import express from 'express'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { db, eventRowToCalendar } from './db.js'
import {
  checkOrigin,
  clearSessionCookie,
  consumeLoginAttemptForKey,
  createSession,
  destroySession,
  getSessionUser,
  loginRateLimited,
  requireAuth,
  resetLoginAttempts,
  securityHeaders,
  setSessionCookie,
  verifyPassword,
} from './auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLIENT_DIST = join(__dirname, '..', 'client', 'dist')
const IMAGES_DIR = join(__dirname, '..', 'client', 'public', 'images')

const app = express()
app.set('trust proxy', 1) //trust caddy/nginx proxy
app.use(express.json({ limit: '1mb' }))
app.use(securityHeaders)
app.use(checkOrigin)

app.get('/status/:id', (req, res) => {
  const printer = db.prepare('SELECT id, status FROM printers WHERE id = ?').get(req.params.id)
  if (!printer) {
    return res.status(404).json({ error: `printer ${req.params.id} not found` })
  }
  res.json({ id: printer.id, status: printer.status ?? 'offline' })
})

app.post('/api/logout', (req, res) => {
  destroySession(req)
  clearSessionCookie(res)
  res.json({ ok: true })
})

app.get('/api/me', (req, res) => {
  const user = getSessionUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })
  res.json({ username: user.username })
})

app.post('/api/login', (req, res) => {

  const key = req.ip
  if (loginRateLimited(key)) {
    return res.status(429).json({ error: 'too many login attempts, try again later' })
  }

  const { username, password } = req.body ?? {}
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    consumeLoginAttemptForKey(key)
    return res.status(400).json({ error: 'username and password are required' })
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  const ok = !!user && verifyPassword(password, user.salt, user.password_hash)

  if (!ok) {
    consumeLoginAttemptForKey(key)
    return res.status(401).json({ error: 'invalid credentials' })
  }

  resetLoginAttempts(key)
  setSessionCookie(res, createSession(user.id))
  res.json({ username: user.username })
})

app.use('/api', requireAuth)

app.get('/printers', (_req, res) => {
  const rows = db.prepare('SELECT id, name, imageUrl, ip, serial, accessCode FROM printers ORDER BY name').all()
  res.json(rows)
})

app.get('/events', (_req, res) => {
  const rows = db.prepare('SELECT * FROM events ORDER BY start').all()
  res.json(rows.map(eventRowToCalendar))
})

app.post('/api/events', (req, res) => {
  const { title, start, end, allDay, groupId, url, description } = req.body ?? {}
  if (!title || !start) {
    return res.status(400).json({ error: 'title and start are required' })
  }
  const result = db
    .prepare('INSERT INTO events (title, start, end, allDay, groupId, url, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(title, start, end ?? null, allDay ? 1 : 0, groupId ?? null, url ?? null, description ?? '')
  res.status(201).json({ id: String(result.lastInsertRowid) })
})

app.put('/api/events/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id)
  if (!existing) {
    return res.status(404).json({ error: 'event not found' })
  }
  const { title, start, end, allDay, groupId, url, description } = req.body ?? {}
  db.prepare(
    'UPDATE events SET title = ?, start = ?, end = ?, allDay = ?, groupId = ?, url = ?, description = ? WHERE id = ?'
  ).run(
    title ?? existing.title,
    start ?? existing.start,
    end !== undefined ? end : existing.end,
    allDay !== undefined ? (allDay ? 1 : 0) : existing.allDay,
    groupId !== undefined ? groupId : existing.groupId,
    url !== undefined ? url : existing.url,
    description ?? existing.description,
    req.params.id
  )
  res.json({ ok: true })
})

app.delete('/api/events/:id', (req, res) => {
  const result = db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id)
  if (result.changes === 0) {
    return res.status(404).json({ error: 'event not found' })
  }
  res.json({ ok: true })
})

app.post('/api/printers', (req, res) => {
  const { id, name, imageUrl, ip, serial, accessCode } = req.body ?? {}
  if (!id || !name) {
    return res.status(400).json({ error: 'id and name are required' })
  }
  db.prepare('INSERT INTO printers (id, name, imageUrl, ip, serial, accessCode) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    name,
    imageUrl ?? null,
    ip ?? null,
    serial ?? null,
    accessCode ?? null
  )
  res.status(201).json({ id })
})

app.put('/api/printers/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM printers WHERE id = ?').get(req.params.id)
  if (!existing) {
    return res.status(404).json({ error: 'printer not found' })
  }
  const { name, imageUrl, ip, serial, accessCode } = req.body ?? {}
  db.prepare('UPDATE printers SET name = ?, imageUrl = ?, ip = ?, serial = ?, accessCode = ? WHERE id = ?').run(
    name ?? existing.name,
    imageUrl !== undefined ? imageUrl : existing.imageUrl,
    ip !== undefined ? ip : existing.ip,
    serial !== undefined ? serial : existing.serial,
    accessCode !== undefined ? accessCode : existing.accessCode,
    req.params.id
  )
  res.json({ ok: true })
})

app.delete('/api/printers/:id', (req, res) => {
  const result = db.prepare('DELETE FROM printers WHERE id = ?').run(req.params.id)
  if (result.changes === 0) {
    return res.status(404).json({ error: 'printer not found' })
  }
  res.json({ ok: true })
})

app.use('/images', cors({ origin: '*' }))
app.use('/images', express.static(IMAGES_DIR))

if (existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST))
  app.get(/^\/(?!api|events|printers|status).*/, (_req, res) => {
    res.sendFile(join(CLIENT_DIST, 'index.html'))
  })
} else {
  console.warn(
    `Client build not found at ${CLIENT_DIST}. Run \`npm run build\` in the client directory or serve the client separately.`
  )
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})