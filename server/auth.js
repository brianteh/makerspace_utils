import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { db } from './db.js'

export const AUTH_COOKIE = 'session'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000
const SCRYPT_KEYLEN = 64
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 }

const LOGIN_MAX = 10
const LOGIN_WINDOW_MS = 15 * 60 * 1000

const parseOrigins = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

export const FRAME_ANCESTORS = parseOrigins(process.env.FRAME_ANCESTORS, '')
export const MUTATION_ORIGINS = parseOrigins(
  process.env.ALLOWED_ORIGINS,
  `http://localhost:5173,http://localhost:3001,${process.env.APP_ORIGIN || 'http://localhost:3001'}`
)

const secureCookie = process.env.NODE_ENV === 'production'

export function hashPassword(password, salt) {
  return scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS).toString('hex')
}

export function verifyPassword(password, salt, expectedHashHex) {
  const actual = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS)
  const expected = Buffer.from(expectedHashHex, 'hex')
  if (actual.length !== expected.length || expected.length !== SCRYPT_KEYLEN) return false
  return timingSafeEqual(actual, expected)
}

function sessionTokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

function parseCookies(req) {
  const header = req.headers.cookie
  if (!header) return {}
  const out = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim())
  }
  return out
}

function cookieToken(req) {
  return parseCookies(req)[AUTH_COOKIE] ?? null
}

export function createSession(userId) {
  const token = randomBytes(32).toString('base64url')
  const now = Date.now()
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    sessionTokenHash(token),
    userId,
    now,
    now + SESSION_TTL_MS
  )
  return token
}

export function getSessionUser(req) {
  const token = cookieToken(req)
  if (!token) return null
  return db
    .prepare(
      `SELECT u.id, u.username
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .get(sessionTokenHash(token), Date.now())
}

export function destroySession(req) {
  const token = cookieToken(req)
  if (!token) return
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sessionTokenHash(token))
}

export function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${
      secureCookie ? '; Secure' : ''
    }`
  )
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`)
}

export function requireAuth(req, res, next) {
  const user = getSessionUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })
  req.user = user
  next()
}

export function securityHeaders(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('Referrer-Policy', 'no-referrer')
  res.set('X-XSS-Protection', '0')
  if (secureCookie) {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  const frameAncestors = FRAME_ANCESTORS.length ? FRAME_ANCESTORS.join(' ') : "'none'"
  if (!FRAME_ANCESTORS.length) {
    res.set('X-Frame-Options', 'DENY')
  }

  res.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors ${frameAncestors}; base-uri 'self'; form-action 'self'`
  )
  next()
}

export function checkOrigin(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()
  const origin = req.headers.origin
  if (!origin) return next()
  if (MUTATION_ORIGINS.includes(origin)) return next()
  return res.status(403).json({ error: 'forbidden origin' })
}

const loginAttempts = new Map()

function consumeLoginAttempt(key) {
  const now = Date.now()
  const rec = loginAttempts.get(key)
  if (!rec || now >= rec.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    return
  }
  rec.count += 1
}

export function loginRateLimited(key) {
  const now = Date.now()
  const rec = loginAttempts.get(key)
  if (!rec || now >= rec.resetAt) return false
  return rec.count >= LOGIN_MAX
}

export function resetLoginAttempts(key) {
  loginAttempts.delete(key)
}

export function consumeLoginAttemptForKey(key) {
  consumeLoginAttempt(key)
}