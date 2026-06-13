import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

router.get('/announcements', async (req, res, next) => {
  try {
    const result = await query(`SELECT a.*, m.nombre || ' ' || m.apellido as creador_nombre
      FROM anuncios a LEFT JOIN miembros m ON a.creado_por = m.id ORDER BY a.created_at DESC LIMIT 20`);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/announcements', authorize('administrador', 'pastor', 'secretaria'), async (req, res, next) => {
  try {
    const { titulo, contenido, tipo } = req.body;
    const id = crypto.randomUUID();
    await query('INSERT INTO anuncios (id, titulo, contenido, tipo, creado_por) VALUES (?, ?, ?, ?, ?)',
      [id, titulo, contenido, tipo || 'general', req.user.miembro_id]);
    const result = await query('SELECT * FROM anuncios WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.get('/contacts', async (req, res, next) => {
  try {
    const result = await query('SELECT id, nombre, apellido, email, telefono FROM miembros WHERE email IS NOT NULL OR telefono IS NOT NULL ORDER BY apellido, nombre');
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/send', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const { para, asunto, mensaje } = req.body;
    if (!para || !asunto || !mensaje) return res.status(400).json({ error: 'Faltan campos' });
    const ids = Array.isArray(para) ? para : [para];
    const comId = crypto.randomUUID();
    await query('INSERT INTO comunicaciones (id, asunto, mensaje, enviado_por) VALUES (?, ?, ?, ?)',
      [comId, asunto, mensaje, req.user.miembro_id]);
    for (const miembroId of ids) {
      await query('INSERT INTO destinatarios_comunicacion (id, comunicacion_id, miembro_id) VALUES (?, ?, ?)',
        [crypto.randomUUID(), comId, miembroId]);
    }
    res.status(201).json({ message: 'Comunicación enviada', id: comId });
  } catch (error) { next(error); }
});

router.get('/sent', async (req, res, next) => {
  try {
    const result = await query(`SELECT c.*, m.nombre || ' ' || m.apellido as remitente
      FROM comunicaciones c LEFT JOIN miembros m ON c.enviado_por = m.id ORDER BY c.created_at DESC LIMIT 10`);
    res.json(result.rows);
  } catch (error) { next(error); }
});

export default router;
