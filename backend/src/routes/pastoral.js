import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

// Visitas Pastorales
router.get('/visits', async (req, res, next) => {
  try {
    const { estado } = req.query;
    let sql = `SELECT v.*, m.nombre || ' ' || m.apellido as miembro_nombre, p.nombre || ' ' || p.apellido as pastor_nombre
      FROM visitas_pastorales v LEFT JOIN miembros m ON v.miembro_id = m.id LEFT JOIN miembros p ON v.pastor_id = p.id WHERE 1=1`;
    const params = [];
    if (estado) { sql += ' AND v.estado = ?'; params.push(estado); }
    sql += ' ORDER BY v.fecha DESC LIMIT 30';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/visits', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const { miembro_id, fecha, motivo, observaciones, proximo_seguimiento, estado } = req.body;
    if (!miembro_id || !fecha || !motivo) return res.status(400).json({ error: 'Miembro, fecha y motivo son requeridos' });
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO visitas_pastorales (id, miembro_id, pastor_id, fecha, motivo, observaciones, proximo_seguimiento, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, miembro_id, req.user.miembro_id || null, fecha, motivo, observaciones || null, proximo_seguimiento || null, estado || 'pendiente']
    );
    const result = await query('SELECT * FROM visitas_pastorales WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.put('/visits/:id', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const fields = ['motivo', 'observaciones', 'proximo_seguimiento', 'estado'];
    const sets = []; const params = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) { sets.push(`${f} = ?`); params.push(req.body[f]); }
    });
    if (sets.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    sets.push("updated_at = datetime('now')");
    params.push(req.params.id);
    await query(`UPDATE visitas_pastorales SET ${sets.join(', ')} WHERE id = ?`, params);
    const result = await query('SELECT * FROM visitas_pastorales WHERE id = ?', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

router.delete('/visits/:id', authorize('administrador'), async (req, res, next) => {
  try {
    await query('DELETE FROM visitas_pastorales WHERE id = ?', [req.params.id]);
    res.json({ message: 'Visita eliminada' });
  } catch (error) { next(error); }
});

// Sesiones de Consejería
router.get('/counseling', async (req, res, next) => {
  try {
    const result = await query(`SELECT s.*, m.nombre || ' ' || m.apellido as miembro_nombre, c.nombre || ' ' || c.apellido as consejero_nombre
      FROM sesiones_consejeria s LEFT JOIN miembros m ON s.miembro_id = m.id LEFT JOIN miembros c ON s.consejero_id = c.id
      ORDER BY s.fecha DESC LIMIT 30`);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/counseling', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const { miembro_id, fecha, tipo, motivo, notas_confidenciales, compromisos, proxima_sesion } = req.body;
    if (!miembro_id || !fecha) return res.status(400).json({ error: 'Miembro y fecha son requeridos' });
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO sesiones_consejeria (id, miembro_id, consejero_id, fecha, tipo, motivo, notas_confidenciales, compromisos, proxima_sesion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, miembro_id, req.user.miembro_id || null, fecha, tipo || 'individual', motivo || null, notas_confidenciales || null, compromisos || null, proxima_sesion || null]
    );
    const result = await query('SELECT * FROM sesiones_consejeria WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

// Bautismos
router.get('/baptisms', async (req, res, next) => {
  try {
    const result = await query(`SELECT b.*, m.nombre || ' ' || m.apellido as miembro_nombre, p.nombre || ' ' || p.apellido as pastor_nombre
      FROM bautismos b LEFT JOIN miembros m ON b.miembro_id = m.id LEFT JOIN miembros p ON b.pastor_id = p.id
      ORDER BY b.fecha DESC LIMIT 30`);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/baptisms', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const { miembro_id, tipo, fecha, pastor_id, iglesia_origen, notas } = req.body;
    if (!miembro_id || !tipo || !fecha) return res.status(400).json({ error: 'Miembro, tipo y fecha son requeridos' });
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO bautismos (id, miembro_id, tipo, fecha, pastor_id, iglesia_origen, notas) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, miembro_id, tipo, fecha, pastor_id || null, iglesia_origen || null, notas || null]
    );
    const result = await query('SELECT * FROM bautismos WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

// Peticiones de Oración
router.get('/prayers', async (req, res, next) => {
  try {
    const { estado } = req.query;
    let sql = `SELECT p.*, m.nombre || ' ' || m.apellido as miembro_nombre FROM peticiones_oracion p LEFT JOIN miembros m ON p.miembro_id = m.id WHERE 1=1`;
    const params = [];
    if (estado) { sql += ' AND p.estado = ?'; params.push(estado); }
    sql += ' ORDER BY p.created_at DESC LIMIT 30';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/prayers', authorize('administrador', 'pastor', 'lider'), async (req, res, next) => {
  try {
    const { titulo, descripcion, es_anonimo } = req.body;
    if (!descripcion) return res.status(400).json({ error: 'Descripción es requerida' });
    const id = crypto.randomUUID();
    await query('INSERT INTO peticiones_oracion (id, miembro_id, titulo, descripcion, es_anonimo) VALUES (?, ?, ?, ?, ?)',
      [id, req.user.miembro_id, titulo || null, descripcion, es_anonimo ? 1 : 0]);
    const result = await query('SELECT * FROM peticiones_oracion WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.put('/prayers/:id', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const { estado, respuesta } = req.body;
    await query('UPDATE peticiones_oracion SET estado = ?, respuesta = ?, fecha_respuesta = ? WHERE id = ?',
      [estado || 'activa', respuesta || null, estado === 'respondida' ? new Date().toISOString().split('T')[0] : null, req.params.id]);
    res.json({ message: 'Petición actualizada' });
  } catch (error) { next(error); }
});

// Situaciones Especiales
router.get('/situations', async (req, res, next) => {
  try {
    const { estado } = req.query;
    let sql = `SELECT s.*, m.nombre || ' ' || m.apellido as miembro_nombre FROM situaciones_especiales s LEFT JOIN miembros m ON s.miembro_id = m.id WHERE 1=1`;
    const params = [];
    if (estado) { sql += ' AND s.estado = ?'; params.push(estado); }
    sql += ' ORDER BY s.fecha_inicio DESC LIMIT 30';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/situations', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const { miembro_id, tipo, descripcion, nivel_urgencia, fecha_inicio } = req.body;
    if (!miembro_id || !tipo || !descripcion) return res.status(400).json({ error: 'Miembro, tipo y descripción son requeridos' });
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO situaciones_especiales (id, miembro_id, tipo, descripcion, nivel_urgencia, fecha_inicio) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, miembro_id, tipo, descripcion, nivel_urgencia || 'media', fecha_inicio || new Date().toISOString().split('T')[0]]
    );
    const result = await query('SELECT * FROM situaciones_especiales WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.put('/situations/:id', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const { estado, notas_seguimiento, fecha_resolucion } = req.body;
    await query('UPDATE situaciones_especiales SET estado = ?, notas_seguimiento = ?, fecha_resolucion = ? WHERE id = ?',
      [estado || 'activa', notas_seguimiento ? JSON.stringify(notas_seguimiento) : null, fecha_resolucion || null, req.params.id]);
    res.json({ message: 'Situación actualizada' });
  } catch (error) { next(error); }
});

export default router;
