import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

router.get('/services', async (req, res, next) => {
  try {
    const { desde, hasta, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT s.*,
      (SELECT COUNT(*) FROM asistencia_servicio WHERE servicio_id = s.id AND estado = 'presente') as presentes,
      (SELECT COUNT(*) FROM asistencia_servicio WHERE servicio_id = s.id) as total
      FROM servicios s WHERE 1=1`;
    const params = [];
    if (desde) { sql += ' AND s.fecha >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND s.fecha <= ?'; params.push(hasta); }
    sql += ' ORDER BY s.fecha DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const result = await query(sql, params);
    res.json({ data: result.rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) { next(error); }
});

router.post('/services', authorize('administrador', 'pastor', 'secretaria'), async (req, res, next) => {
  try {
    const { tipo, fecha, hora, titulo, predicador, notas } = req.body;
    const id = crypto.randomUUID();
    await query('INSERT INTO servicios (id, tipo, fecha, hora, titulo, predicador, notas) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, tipo, fecha, hora, titulo, predicador, notas]);
    const result = await query('SELECT * FROM servicios WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.get('/services/:id', async (req, res, next) => {
  try {
    const servicio = await query('SELECT * FROM servicios WHERE id = ?', [req.params.id]);
    if (servicio.rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
    const asistentes = await query(
      'SELECT a.*, m.nombre, m.apellido FROM asistencia_servicio a JOIN miembros m ON a.miembro_id = m.id WHERE a.servicio_id = ? ORDER BY m.nombre',
      [req.params.id]);
    res.json({ servicio: servicio.rows[0], asistentes: asistentes.rows });
  } catch (error) { next(error); }
});

router.post('/services/:id/register', authorize('administrador', 'pastor', 'secretaria', 'lider'), async (req, res, next) => {
  try {
    const { asistencias } = req.body;
    if (!Array.isArray(asistencias)) return res.status(400).json({ error: 'asistencias debe ser un array' });
    for (const a of asistencias) {
      await query('INSERT OR REPLACE INTO asistencia_servicio (id, servicio_id, miembro_id, estado) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), req.params.id, a.miembro_id, a.estado || 'presente']);
    }
    res.json({ message: 'Asistencia registrada', count: asistencias.length });
  } catch (error) { next(error); }
});

router.get('/trends', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT strftime('%Y-%W', s.fecha) as semana, s.tipo,
        COUNT(*) as total,
        SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) as presentes
      FROM servicios s JOIN asistencia_servicio a ON s.id = a.servicio_id
      WHERE s.fecha >= date('now', '-3 months')
      GROUP BY semana, s.tipo ORDER BY semana`);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.get('/absentees', async (req, res, next) => {
  try {
    const semanas = parseInt(req.query.semanas) || 3;
    const result = await query(`
      SELECT m.id, m.nombre, m.apellido, m.telefono, m.email
      FROM miembros m WHERE m.estado = 'activo' AND m.id NOT IN (
        SELECT DISTINCT a.miembro_id FROM asistencia_servicio a
        JOIN servicios s ON a.servicio_id = s.id
        WHERE s.fecha >= date('now', ? || ' weeks', '-0 days')
      )`, [String(-semanas)]);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.get('/stats-by-day', async (req, res, next) => {
  try {
    const semanas = parseInt(req.query.semanas) || 8;
    const result = await query(`
      SELECT s.tipo,
        COUNT(*) as total_servicios,
        SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) as presentes,
        COUNT(a.id) as total_asistencias
      FROM servicios s LEFT JOIN asistencia_servicio a ON s.id = a.servicio_id
      WHERE s.fecha >= date('now', ? || ' weeks', '-0 days')
      GROUP BY s.tipo ORDER BY s.tipo`, [String(-semanas)]);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.get('/member-summary', async (req, res, next) => {
  try {
    const semanas = parseInt(req.query.semanas) || 8;
    const limit = parseInt(req.query.limit) || 100;
    const result = await query(`
      SELECT m.id, m.nombre, m.apellido,
        COUNT(a.id) as total_servicios,
        ROUND(CAST(SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) AS REAL) / MAX(COUNT(a.id), 1) * 100) as porcentaje,
        SUM(CASE WHEN s.tipo = 'culto_domingo' AND a.estado = 'presente' THEN 1 ELSE 0 END) as domingo_p,
        SUM(CASE WHEN s.tipo = 'culto_martes' AND a.estado = 'presente' THEN 1 ELSE 0 END) as martes_p,
        SUM(CASE WHEN s.tipo = 'culto_jueves' AND a.estado = 'presente' THEN 1 ELSE 0 END) as jueves_p
      FROM miembros m
      LEFT JOIN asistencia_servicio a ON a.miembro_id = m.id
      LEFT JOIN servicios s ON s.id = a.servicio_id AND s.fecha >= date('now', ? || ' weeks', '-0 days')
      WHERE m.estado = 'activo'
      GROUP BY m.id ORDER BY porcentaje DESC LIMIT ?`, [String(-semanas), limit]);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

router.get('/member/:id', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT s.fecha, s.tipo, s.titulo, a.estado
      FROM asistencia_servicio a JOIN servicios s ON a.servicio_id = s.id
      WHERE a.miembro_id = ? ORDER BY s.fecha DESC LIMIT 20`, [req.params.id]);
    res.json(result.rows);
  } catch (error) { next(error); }
});

export default router;
