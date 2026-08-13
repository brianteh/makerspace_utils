import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, 'data')
mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(join(dataDir, 'db.sqlite3'))

db.exec(`PRAGMA journal_mode = WAL;`)

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    start TEXT NOT NULL,
    end TEXT,
    allDay INTEGER DEFAULT 0,
    groupId TEXT,
    url TEXT,
    description TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS printers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    imageUrl TEXT,
    ip TEXT,
    serial TEXT,
    accessCode TEXT,
    status TEXT DEFAULT 'offline',
    statusUpdatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
`)

const SEED_EVENTS = [
  { title: 'All Day Event', start: '2026-05-01', description: 'description for All Day Event' },
  { title: 'Long Event', start: '2026-05-07', end: '2026-05-10', description: 'description for Long Event' },
  { groupId: '999', title: 'Repeating Event', start: '2026-05-09T16:00:00', description: 'description for Repeating Event' },
  { groupId: '999', title: 'Repeating Event', start: '2026-05-16T16:00:00', description: 'description for Repeating Event' },
  { title: 'Conference', start: '2026-05-11', end: '2026-05-13', description: 'description for Conference' },
  { title: 'Meeting', start: '2026-05-12T10:30:00', end: '2026-05-12T12:30:00', description: 'description for Meeting' },
  { title: 'Lunch', start: '2026-05-12T12:00:00', description: 'description for Lunch' },
  { title: 'Meeting', start: '2026-05-12T14:30:00', description: 'description for Meeting' },
  { title: 'Birthday Party', start: '2026-05-13T07:00:00', description: 'description for Birthday Party' },
  { title: 'Click for Google', start: '2026-05-28', url: 'https://google.com/', description: 'description for Click for Google' },
]

const SEED_PRINTERS = [
  { id: 'bambu-lab-p1s-yippee', name: 'Yippee', imageUrl: '/images/bambu-lab-p1s.jpg', ip: '192.168.31.73', serial: '01P00C510900887', accessCode: '26897419' },
  { id: 'bambu-lab-p1s-wahoo', name: 'Wahoo', imageUrl: '/images/bambu-lab-p1s.jpg', ip: '192.168.31.99', serial: '01P00C510900903', accessCode: '29571127' },
  { id: 'bambu-lab-p1s-yahoo', name: 'Yahoo', imageUrl: '/images/bambu-lab-p1s.jpg' },
  { id: 'bambu-lab-h2c-wahoo', name: 'H2C', imageUrl: '/images/bambu-lab-h2c.jpg' },
]

const PRINTER_COLUMNS = ['ip', 'serial', 'accessCode', 'status', 'statusUpdatedAt']

function migratePrinters() {
  const existing = new Set(
    db.prepare('PRAGMA table_info(printers)').all().map((c) => c.name)
  )
  for (const col of PRINTER_COLUMNS) {
    if (existing.has(col)) continue
    const def =
      col === 'status' ? "TEXT DEFAULT 'offline'" : 'TEXT'
    db.exec(`ALTER TABLE printers ADD COLUMN ${col} ${def}`)
  }
}

migratePrinters()

function backfillPrinterCredentials() {
  const stmt = db.prepare(
    'UPDATE printers SET ip = ?, serial = ?, accessCode = ? WHERE id = ? AND ip IS NULL AND serial IS NULL AND accessCode IS NULL'
  )
  for (const p of SEED_PRINTERS) {
    if (p.ip && p.serial && p.accessCode) {
      stmt.run(p.ip, p.serial, p.accessCode, p.id)
    }
  }
}

backfillPrinterCredentials()

function seed() {
  const { count: eventCount } = db.prepare('SELECT COUNT(*) AS count FROM events').get()
  if (eventCount === 0) {
    const stmt = db.prepare(
      'INSERT INTO events (title, start, end, allDay, groupId, url, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    for (const e of SEED_EVENTS) {
      stmt.run(e.title, e.start, e.end ?? null, e.allDay ? 1 : 0, e.groupId ?? null, e.url ?? null, e.description ?? '')
    }
  }

  const { count: printerCount } = db.prepare('SELECT COUNT(*) AS count FROM printers').get()
  if (printerCount === 0) {
    const stmt = db.prepare('INSERT INTO printers (id, name, imageUrl, ip, serial, accessCode) VALUES (?, ?, ?, ?, ?, ?)')
    for (const p of SEED_PRINTERS) {
      stmt.run(p.id, p.name, p.imageUrl, p.ip ?? null, p.serial ?? null, p.accessCode ?? null)
    }
  }
}

seed()

export const eventRowToCalendar = (row) => ({
  id: String(row.id),
  title: row.title,
  start: row.start,
  end: row.end ?? undefined,
  allDay: !!row.allDay,
  groupId: row.groupId ?? undefined,
  url: row.url ?? undefined,
  extendedProps: { description: row.description ?? '' },
})