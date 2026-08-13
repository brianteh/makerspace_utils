import { randomBytes } from 'node:crypto'
import { db } from './db.js'
import { hashPassword } from './auth.js'

const [,, username, password] = process.argv

if (!username || !password) {
  console.error('Usage: node create-admin.js <username> <password>')
  process.exit(1)
}

if (password.length < 12) {
  console.error('Password must be at least 12 characters')
  process.exit(1)
}

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
if (existing) {
  console.error(`User "${username}" already exists`)
  process.exit(1)
}

const salt = randomBytes(16).toString('hex')
const passwordHash = hashPassword(password, salt)

db.prepare('INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)').run(
  username,
  passwordHash,
  salt
)

console.log(`Admin user "${username}" created`)
