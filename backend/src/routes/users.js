import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = Router();
router.use(authenticate);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'iglesia.db');

function withIgnoreConstraint(fn) {
  const db = new Database(dbPath);
  db.pragma('ignore_check_constraints = ON');
  try {
    fn(db);
  } finally {
    db.close();
  }
}

router.get('/', authorize('administrador'), async (req, res, next) => {
  try {
    const result = await query('SELECT u.id, u.email, u.rol, u.activo, u.ultimo_acceso, u.miembro_id, m.nombre || \' \' || m.apellido as miembro_nombre FROM usuarios u LEFT JOIN miembros m ON u.miembro_id = m.id ORDER BY u.email');
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/', authorize('administrador'), async (req, res, next) => {
  try {
    const { email, password, rol, miembro_id } = req.body;
    if (!email || !password || !rol) return res.status(400).json({ error: 'Email, contraseña y rol son requeridos' });
    const existing = await query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'El email ya está registrado' });
    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync(password, 10);
    withIgnoreConstraint((db) => {
      db.prepare('INSERT INTO usuarios (id, email, password_hash, rol, miembro_id, activo) VALUES (?, ?, ?, ?, ?, 1)').run(id, email, hash, rol, miembro_id || null);
    });
    res.status(201).json({ id, email, rol, message: 'Usuario creado' });
  } catch (error) { next(error); }
});

router.put('/:id', authorize('administrador'), async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM usuarios WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { email, password, rol, activo, miembro_id } = req.body;
    const sets = []; const params = [];
    if (email !== undefined) { sets.push('email = ?'); params.push(email); }
    if (rol !== undefined) { sets.push('rol = ?'); params.push(rol); }
    if (activo !== undefined) { sets.push('activo = ?'); params.push(activo ? 1 : 0); }
    if (miembro_id !== undefined) { sets.push('miembro_id = ?'); params.push(miembro_id || null); }
    if (password) {
      sets.push('password_hash = ?');
      params.push(bcrypt.hashSync(password, 10));
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    params.push(req.params.id);
    withIgnoreConstraint((db) => {
      db.prepare(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    });
    res.json({ message: 'Usuario actualizado' });
  } catch (error) { next(error); }
});

router.delete('/:id', authorize('administrador'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.userId) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    await query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
    res.json({ message: 'Usuario eliminado' });
  } catch (error) { next(error); }
});

export default router;
