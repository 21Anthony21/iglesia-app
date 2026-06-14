import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { estado, tipo } = req.query;
    let sql = `SELECT e.*, m.nombre || ' ' || m.apellido as responsable_nombre FROM eventos e LEFT JOIN miembros m ON e.responsable_id = m.id WHERE 1=1`;
    const params = [];
    if (estado) { sql += ' AND e.estado = ?'; params.push(estado); }
    if (tipo) { sql += ' AND e.tipo = ?'; params.push(tipo); }
    sql += ' ORDER BY e.fecha_inicio DESC LIMIT 50';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(`SELECT e.*, m.nombre || ' ' || m.apellido as responsable_nombre FROM eventos e LEFT JOIN miembros m ON e.responsable_id = m.id WHERE e.id = ?`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    const inscripciones = await query(`SELECT ie.*, m.nombre, m.apellido, m.email, m.telefono FROM inscripciones_evento ie JOIN miembros m ON ie.miembro_id = m.id WHERE ie.evento_id = ? ORDER BY ie.created_at`, [req.params.id]);
    res.json({ ...result.rows[0], inscripciones: inscripciones.rows });
  } catch (error) { next(error); }
});

router.post('/', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const { titulo, tipo, descripcion, fecha_inicio, fecha_fin, espacio_id, responsable_id, cupo_maximo, requiere_inscripcion, costo, color } = req.body;
    if (!titulo || !tipo || !fecha_inicio) return res.status(400).json({ error: 'Título, tipo y fecha de inicio son requeridos' });
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO eventos (id, titulo, tipo, descripcion, fecha_inicio, fecha_fin, espacio_id, responsable_id, cupo_maximo, requiere_inscripcion, costo, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, titulo, tipo, descripcion || null, fecha_inicio, fecha_fin || null, espacio_id || null, responsable_id || null, cupo_maximo || null, requiere_inscripcion ? 1 : 0, costo || 0, color || '#3b82f6']
    );
    const result = await query('SELECT * FROM eventos WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.put('/:id', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM eventos WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    const fields = ['titulo','tipo','descripcion','fecha_inicio','fecha_fin','espacio_id','responsable_id','cupo_maximo','requiere_inscripcion','costo','color','estado'];
    const sets = []; const params = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) { sets.push(`${f} = ?`); params.push(req.body[f]); }
    });
    if (sets.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    sets.push("updated_at = datetime('now')");
    params.push(req.params.id);
    await query(`UPDATE eventos SET ${sets.join(', ')} WHERE id = ?`, params);
    const result = await query('SELECT * FROM eventos WHERE id = ?', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

router.delete('/:id', authorize('administrador'), async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM eventos WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    await query('DELETE FROM eventos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Evento eliminado' });
  } catch (error) { next(error); }
});

router.post('/:id/register', authorize('administrador', 'pastor', 'secretaria'), async (req, res, next) => {
  try {
    const { miembro_id } = req.body;
    if (!miembro_id) return res.status(400).json({ error: 'miembro_id es requerido' });
    const existing = await query('SELECT * FROM inscripciones_evento WHERE evento_id = ? AND miembro_id = ?', [req.params.id, miembro_id]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'El miembro ya está inscrito' });
    const id = crypto.randomUUID();
    await query('INSERT INTO inscripciones_evento (id, evento_id, miembro_id) VALUES (?, ?, ?)', [id, req.params.id, miembro_id]);
    res.status(201).json({ message: 'Inscripción exitosa' });
  } catch (error) { next(error); }
});

router.delete('/:id/register/:miembroId', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    await query('DELETE FROM inscripciones_evento WHERE evento_id = ? AND miembro_id = ?', [req.params.id, req.params.miembroId]);
    res.json({ message: 'Inscripción cancelada' });
  } catch (error) { next(error); }
});

export default router;
