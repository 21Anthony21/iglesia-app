import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '..', 'data');
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
    import('bcryptjs').then(bcrypt => {
      const hash = bcrypt.hashSync('admin123', 10);
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO usuarios (id, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, 1)').run('admin-' + id, 'admin@iglesia.com', hash, 'administrador');
      console.log('Usuario admin creado: admin@iglesia.com / admin123');
    });
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
