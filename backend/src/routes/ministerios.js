import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT m.*, mm.cantidad_miembros
      FROM ministerios m
      LEFT JOIN (SELECT ministerio_id, COUNT(*) as cantidad_miembros FROM miembros_ministerio WHERE activo = 1 GROUP BY ministerio_id) mm ON mm.ministerio_id = m.id
      ORDER BY m.nombre
    `);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const ministerio = await query('SELECT * FROM ministerios WHERE id = ?', [req.params.id]);
    if (ministerio.rows.length === 0) return res.status(404).json({ error: 'Ministerio no encontrado' });
    const miembros = await query(`
      SELECT mm.*, m.nombre, m.apellido, m.email, m.telefono
      FROM miembros_ministerio mm
      JOIN miembros m ON mm.miembro_id = m.id
      WHERE mm.ministerio_id = ? AND mm.activo = 1
      ORDER BY m.apellido, m.nombre
    `, [req.params.id]);
    res.json({ ...ministerio.rows[0], miembros: miembros.rows });
  } catch (error) { next(error); }
});

router.post('/', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const { nombre, descripcion, lider_id, email, telefono, presupuesto_anual } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO ministerios (id, nombre, descripcion, lider_id, email, telefono, presupuesto_anual) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, nombre, descripcion || null, lider_id || null, email || null, telefono || null, presupuesto_anual || 0]
    );
    const result = await query('SELECT * FROM ministerios WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.put('/:id', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM ministerios WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Ministerio no encontrado' });
    const fields = ['nombre', 'descripcion', 'lider_id', 'email', 'telefono', 'presupuesto_anual'];
    const sets = []; const params = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) { sets.push(`${f} = ?`); params.push(req.body[f]); }
    });
    if (sets.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    sets.push("updated_at = datetime('now')");
    params.push(req.params.id);
    await query(`UPDATE ministerios SET ${sets.join(', ')} WHERE id = ?`, params);
    const result = await query('SELECT * FROM ministerios WHERE id = ?', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

router.delete('/:id', authorize('administrador'), async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM ministerios WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Ministerio no encontrado' });
    await query('DELETE FROM ministerios WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ministerio eliminado' });
  } catch (error) { next(error); }
});

router.post('/:id/members', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const { miembro_id, rol } = req.body;
    if (!miembro_id) return res.status(400).json({ error: 'miembro_id es requerido' });
    const existing = await query('SELECT * FROM miembros_ministerio WHERE ministerio_id = ? AND miembro_id = ?', [req.params.id, miembro_id]);
    if (existing.rows.length > 0) {
      await query('UPDATE miembros_ministerio SET activo = 1, fecha_fin = NULL WHERE ministerio_id = ? AND miembro_id = ?', [req.params.id, miembro_id]);
    } else {
      const id = crypto.randomUUID();
      await query('INSERT INTO miembros_ministerio (id, ministerio_id, miembro_id, rol) VALUES (?, ?, ?, ?)', [id, req.params.id, miembro_id, rol || 'miembro']);
    }
    const miembro = await query('SELECT m.nombre, m.apellido FROM miembros m WHERE m.id = ?', [miembro_id]);
    res.status(201).json({ message: `Miembro agregado al ministerio`, miembro: miembro.rows[0] });
  } catch (error) { next(error); }
});

router.delete('/:id/members/:miembroId', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const result = await query('UPDATE miembros_ministerio SET activo = 0, fecha_fin = date(?) WHERE ministerio_id = ? AND miembro_id = ?', [new Date().toISOString().split('T')[0], req.params.id, req.params.miembroId]);
    if (result.changes === 0) return res.status(404).json({ error: 'Miembro no encontrado en este ministerio' });
    res.json({ message: 'Miembro removido del ministerio' });
  } catch (error) { next(error); }
});

export default router;
