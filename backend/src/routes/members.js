import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { estado, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM miembros WHERE 1=1';
    const params = [];
    if (estado) { sql += ' AND estado = ?'; params.push(estado); }
    if (search) { sql += ' AND (nombre LIKE ? OR apellido LIKE ? OR cedula LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }
    const total = (await query('SELECT COUNT(*) as c FROM miembros' + (estado ? ' WHERE estado = ?' : ''), estado ? [estado] : [])).rows[0].c;
    sql += ' ORDER BY apellido, nombre LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const result = await query(sql, params);
    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM miembros WHERE id = ?', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Miembro no encontrado' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

router.post('/', authorize('administrador', 'pastor', 'secretaria'), async (req, res, next) => {
  try {
    const { nombre, apellido, cedula, pasaporte, fecha_nacimiento, direccion, telefono, telefono_alternativo, email, estado_civil, conyuge_id, ocupacion, fecha_conversion, fecha_membresia, estado, notas } = req.body;
    if (!nombre || !apellido) return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO miembros (id, nombre, apellido, cedula, pasaporte, fecha_nacimiento, direccion, telefono, telefono_alternativo, email, estado_civil, conyuge_id, ocupacion, fecha_conversion, fecha_membresia, estado, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, nombre, apellido, cedula || null, pasaporte || null, fecha_nacimiento || null, direccion || null, telefono || null, telefono_alternativo || null, email || null, estado_civil || null, conyuge_id || null, ocupacion || null, fecha_conversion || null, fecha_membresia || null, estado || 'activo', notas || null]
    );
    const result = await query('SELECT * FROM miembros WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.put('/:id', authorize('administrador', 'pastor', 'secretaria'), async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM miembros WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Miembro no encontrado' });
    const fields = ['nombre','apellido','cedula','pasaporte','fecha_nacimiento','direccion','telefono','telefono_alternativo','email','estado_civil','conyuge_id','ocupacion','fecha_conversion','fecha_membresia','estado','notas'];
    const sets = []; const params = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) { sets.push(`${f} = ?`); params.push(req.body[f]); }
    });
    if (sets.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    sets.push("updated_at = datetime('now')");
    params.push(req.params.id);
    await query(`UPDATE miembros SET ${sets.join(', ')} WHERE id = ?`, params);
    const result = await query('SELECT * FROM miembros WHERE id = ?', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

router.delete('/:id', authorize('administrador'), async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM miembros WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Miembro no encontrado' });
    await query('DELETE FROM miembros WHERE id = ?', [req.params.id]);
    res.json({ message: 'Miembro eliminado' });
  } catch (error) { next(error); }
});

export default router;
