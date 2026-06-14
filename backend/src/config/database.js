import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'iglesia.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const tableCount = db.prepare("SELECT COUNT(*) as c FROM sqlite_master WHERE type='table'").get().c;
if (tableCount === 0) {
  const initSql = fs.readFileSync(path.join(__dirname, '..', '..', 'sql', 'init.sql'), 'utf8');
  db.exec(initSql);

  const userCount = db.prepare('SELECT COUNT(*) as c FROM usuarios').get().c;
  if (userCount === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    const id1 = crypto.randomUUID();
    db.prepare('INSERT INTO usuarios (id, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, 1)').run('admin-' + id1, 'admin@iglesia.com', hash, 'administrador');
    const id2 = crypto.randomUUID();
    db.prepare('INSERT INTO usuarios (id, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, 1)').run('anthony-' + id2, 'anthony@iglesia.com', hash, 'administrador');
    console.log('Usuarios creados: admin@iglesia.com / anthony@iglesia.com (password: admin123)');
  }
  console.log('Base de datos inicializada');
}

export function query(sql, params = []) {
  const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('WITH');
  if (isSelect) {
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return { rows };
  } else {
    const stmt = db.prepare(sql);
    const info = stmt.run(...params);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  }
}

export default db;
