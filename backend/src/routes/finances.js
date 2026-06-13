import { Router } from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { generatePDF, generateTreasuryReportPDF, generateMonthlyReportPDF } from '../utils/pdfGenerator.js';
import { generateExcel, getFinancesExcelColumns } from '../utils/excelGenerator.js';
import { sendEmail, getTitheReceiptHTML } from '../utils/emailService.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'expenses');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(authenticate);

// DIEZMOS
router.get('/tithes', async (req, res, next) => {
  try {
    const { desde, hasta, miembro_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT d.*, m.nombre, m.apellido FROM diezmos d LEFT JOIN miembros m ON d.miembro_id = m.id WHERE 1=1`;
    const params = [];
    if (desde) { sql += ` AND d.fecha >= ?`; params.push(desde); }
    if (hasta) { sql += ` AND d.fecha <= ?`; params.push(hasta); }
    if (miembro_id) { sql += ` AND d.miembro_id = ?`; params.push(miembro_id); }
    const total = (await query(`SELECT COUNT(*) as c FROM diezmos d WHERE 1=1` + (miembro_id ? ' AND d.miembro_id = ?' : ''), miembro_id ? [miembro_id] : [])).rows[0].c;
    sql += ` ORDER BY d.fecha DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    const result = await query(sql, params);
    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) { next(error); }
});

router.post('/tithes', authorize('administrador', 'pastor', 'secretaria'), async (req, res, next) => {
  try {
    const { miembro_id, fecha, monto, metodo_pago, referencia, notas } = req.body;
    const id = crypto.randomUUID();
    const nextNum = await query("SELECT IFNULL(MAX(CAST(recibo_numero AS INTEGER)), 0) + 1 as next FROM diezmos WHERE recibo_numero GLOB '[0-9]*'");
    const recibo_numero = String(nextNum.rows[0]?.next || 1).padStart(6, '0');
    await query(
      'INSERT INTO diezmos (id, miembro_id, fecha, monto, metodo_pago, referencia, recibo_numero, notas, registrado_por, servicio_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, miembro_id, fecha, monto, metodo_pago || 'efectivo', referencia, recibo_numero, notas, req.user.miembro_id, req.body.servicio_id || null]
    );
    const result = await query('SELECT * FROM diezmos WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.get('/tithes/:id/receipt', async (req, res, next) => {
  try {
    const result = await query('SELECT d.*, m.nombre, m.apellido, m.email FROM diezmos d JOIN miembros m ON d.miembro_id = m.id WHERE d.id = ?', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Diezmo no encontrado' });
    const t = result.rows[0];
    const html = getTitheReceiptHTML({
      nombre: `${t.nombre} ${t.apellido}`, fecha: new Date(t.fecha).toLocaleDateString('es-ES'),
      monto: t.monto, recibo_numero: t.recibo_numero,
    });
    const pdf = await generatePDF(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibo-diezmo-${t.recibo_numero}.pdf`);
    res.send(pdf);
  } catch (error) { next(error); }
});

router.post('/tithes/:id/send-email', authorize('administrador', 'pastor', 'secretaria'), async (req, res, next) => {
  try {
    const result = await query('SELECT d.*, m.nombre, m.apellido, m.email FROM diezmos d JOIN miembros m ON d.miembro_id = m.id WHERE d.id = ?', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Diezmo no encontrado' });
    const t = result.rows[0];
    if (!t.email) return res.status(400).json({ error: 'El miembro no tiene email' });
    const html = getTitheReceiptHTML({ nombre: `${t.nombre} ${t.apellido}`, fecha: new Date(t.fecha).toLocaleDateString('es-ES'), monto: t.monto, recibo_numero: t.recibo_numero });
    await sendEmail({ to: t.email, subject: `Recibo de Diezmo N° ${t.recibo_numero}`, html });
    res.json({ message: 'Recibo enviado' });
  } catch (error) { next(error); }
});

// OFRENDAS
router.get('/offerings', async (req, res, next) => {
  try {
    const { desde, hasta, tipo, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM ofrendas WHERE 1=1';
    const params = [];
    if (desde) { sql += ' AND fecha >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND fecha <= ?'; params.push(hasta); }
    if (tipo) { sql += ' AND tipo = ?'; params.push(tipo); }
    sql += ' ORDER BY fecha DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (page - 1) * limit);
    const result = await query(sql, params);
    res.json({ data: result.rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) { next(error); }
});

router.post('/offerings', authorize('administrador', 'pastor', 'secretaria'), async (req, res, next) => {
  try {
    const { tipo, descripcion, fecha, monto, metodo_pago, donante_nombre, donante_id, notas } = req.body;
    const id = crypto.randomUUID();
    await query(
      'INSERT INTO ofrendas (id, tipo, descripcion, fecha, monto, metodo_pago, donante_nombre, donante_id, notas, registrado_por, servicio_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, tipo, descripcion, fecha, monto, metodo_pago || 'efectivo', donante_nombre, donante_id, notas, req.user.miembro_id, req.body.servicio_id || null]
    );
    const result = await query('SELECT * FROM ofrendas WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

// EGRESOS
router.get('/expenses', async (req, res, next) => {
  try {
    const { desde, hasta, categoria_id, page = 1, limit = 20 } = req.query;
    let sql = `SELECT e.*, c.nombre as categoria_nombre FROM egresos e LEFT JOIN categorias_egresos c ON e.categoria_id = c.id WHERE 1=1`;
    const params = [];
    if (desde) { sql += ' AND e.fecha >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND e.fecha <= ?'; params.push(hasta); }
    if (categoria_id) { sql += ' AND e.categoria_id = ?'; params.push(categoria_id); }
    sql += ' ORDER BY e.fecha DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (page - 1) * limit);
    const result = await query(sql, params);
    res.json({ data: result.rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) { next(error); }
});

router.post('/expenses', authorize('administrador', 'pastor', 'secretaria'), async (req, res, next) => {
  try {
    const { categoria_id, descripcion, fecha, monto, metodo_pago, beneficiario, factura_numero, notas } = req.body;
    const id = crypto.randomUUID();
    await query(
      'INSERT INTO egresos (id, categoria_id, descripcion, fecha, monto, metodo_pago, beneficiario, factura_numero, notas, registrado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, categoria_id, descripcion, fecha, monto, metodo_pago || 'efectivo', beneficiario, factura_numero, notas, req.user.miembro_id]
    );
    const result = await query('SELECT * FROM egresos WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.get('/expense-categories', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM categorias_egresos ORDER BY nombre');
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/expense-categories', authorize('administrador'), async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;
    const id = crypto.randomUUID();
    await query('INSERT INTO categorias_egresos (id, nombre, descripcion) VALUES (?, ?, ?)', [id, nombre, descripcion]);
    const result = await query('SELECT * FROM categorias_egresos WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

// PRESUPUESTOS
router.get('/budgets', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.*, m.nombre as ministerio_nombre,
        (SELECT IFNULL(SUM(monto_ejecutado), 0) FROM ejecucion_presupuesto WHERE presupuesto_id = p.id) as ejecutado
      FROM presupuestos p LEFT JOIN ministerios m ON p.ministerio_id = m.id ORDER BY p.ano DESC, p.nombre`);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/budgets', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const { nombre, ministerio_id, ano, monto_total, descripcion } = req.body;
    const id = crypto.randomUUID();
    await query('INSERT INTO presupuestos (id, nombre, ministerio_id, ano, monto_total, descripcion) VALUES (?, ?, ?, ?, ?, ?)',
      [id, nombre, ministerio_id || null, ano, monto_total, descripcion]);
    const result = await query('SELECT * FROM presupuestos WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

// METAS
router.get('/goals', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM metas_recaudacion ORDER BY activa DESC, fecha_fin');
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/goals', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const { nombre, descripcion, monto_meta, fecha_inicio, fecha_fin } = req.body;
    const id = crypto.randomUUID();
    await query('INSERT INTO metas_recaudacion (id, nombre, descripcion, monto_meta, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?, ?)',
      [id, nombre, descripcion, monto_meta, fecha_inicio, fecha_fin]);
    const result = await query('SELECT * FROM metas_recaudacion WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

// CAJA CHICA
router.get('/petty-cash', async (req, res, next) => {
  try {
    const result = await query('SELECT cc.*, m.nombre, m.apellido FROM caja_chica cc LEFT JOIN miembros m ON cc.responsable_id = m.id ORDER BY cc.created_at DESC LIMIT 10');
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/petty-cash', authorize('administrador', 'pastor', 'secretaria'), async (req, res, next) => {
  try {
    const { monto_inicial, responsable_id, notas } = req.body;
    const id = crypto.randomUUID();
    await query('INSERT INTO caja_chica (id, monto_inicial, monto_actual, responsable_id, notas) VALUES (?, ?, ?, ?, ?)',
      [id, monto_inicial, monto_inicial, responsable_id || req.user.miembro_id, notas]);
    await query('INSERT INTO movimientos_caja (id, caja_id, tipo, monto, descripcion, registrado_por) VALUES (?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), id, 'apertura', monto_inicial, 'Apertura de caja', req.user.miembro_id]);
    const result = await query('SELECT * FROM caja_chica WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

// PRIMICIAS
router.get('/firstfruits', async (req, res, next) => {
  try {
    const { desde, hasta, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT p.*, m.nombre, m.apellido FROM primicias p LEFT JOIN miembros m ON p.miembro_id = m.id WHERE 1=1`;
    const params = [];
    if (desde) { sql += ' AND p.fecha >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND p.fecha <= ?'; params.push(hasta); }
    sql += ' ORDER BY p.fecha DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const result = await query(sql, params);
    res.json({ data: result.rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) { next(error); }
});

router.post('/firstfruits', authorize('administrador', 'pastor', 'secretaria'), async (req, res, next) => {
  try {
    const { miembro_id, fecha, monto, tipo_periodo, periodo_referencia, metodo_pago, notas } = req.body;
    const id = crypto.randomUUID();
    const nextNum = await query("SELECT IFNULL(MAX(CAST(recibo_numero AS INTEGER)), 0) + 1 as next FROM primicias WHERE recibo_numero GLOB '[0-9]*'");
    const recibo_numero = String(nextNum.rows[0]?.next || 1).padStart(6, '0');
    await query(
      'INSERT INTO primicias (id, miembro_id, fecha, monto, tipo_periodo, periodo_referencia, metodo_pago, recibo_numero, notas, registrado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, miembro_id || null, fecha, monto, tipo_periodo || 'mensual', periodo_referencia, metodo_pago || 'efectivo', recibo_numero, notas, req.user.miembro_id]
    );
    const result = await query('SELECT * FROM primicias WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

// REPORTE POR CULTO
router.get('/reports/services', async (req, res, next) => {
  try {
    const { desde, hasta, limit = 20 } = req.query;
    let sql = `SELECT s.id, s.tipo, s.fecha, s.titulo, s.predicador,
      COALESCE(d.cnt, 0) as total_diezmos, COALESCE(d.monto, 0) as monto_diezmos,
      COALESCE(o.cnt, 0) as total_ofrendas, COALESCE(o.monto, 0) as monto_ofrendas
      FROM servicios s
      LEFT JOIN (SELECT servicio_id, COUNT(*) as cnt, SUM(monto) as monto FROM diezmos GROUP BY servicio_id) d ON d.servicio_id = s.id
      LEFT JOIN (SELECT servicio_id, COUNT(*) as cnt, SUM(monto) as monto FROM ofrendas GROUP BY servicio_id) o ON o.servicio_id = s.id
      WHERE 1=1`;
    const params = [];
    if (desde) { sql += ' AND s.fecha >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND s.fecha <= ?'; params.push(hasta); }
    sql += ' ORDER BY s.fecha DESC LIMIT ?';
    params.push(parseInt(limit));
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.get('/reports/by-service/:id', async (req, res, next) => {
  try {
    const sid = req.params.id;
    const servicio = (await query('SELECT * FROM servicios WHERE id = ?', [sid])).rows[0];
    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });

    const diezmos = await query(
      `SELECT d.*, m.nombre, m.apellido FROM diezmos d LEFT JOIN miembros m ON d.miembro_id = m.id WHERE d.servicio_id = ? ORDER BY m.apellido`, [sid]);
    const ofrendas = await query(
      `SELECT * FROM ofrendas WHERE servicio_id = ? ORDER BY created_at`, [sid]);

    res.json({
      servicio,
      diezmos: diezmos.rows,
      ofrendas: ofrendas.rows,
      resumen: {
        total_diezmeros: diezmos.rows.length,
        monto_diezmos: diezmos.rows.reduce((a, d) => a + d.monto, 0),
        total_ofrendas: ofrendas.rows.length,
        monto_ofrendas: ofrendas.rows.reduce((a, o) => a + o.monto, 0),
      },
    });
  } catch (error) { next(error); }
});

// REPORTES
router.get('/reports/summary', async (req, res, next) => {
  try {
    const { desde, hasta } = req.query;
    const d = desde || '1900-01-01', h = hasta || '2099-12-31';
    const ingresos = await query(`SELECT IFNULL(SUM(monto), 0) as total FROM (SELECT monto FROM diezmos WHERE fecha BETWEEN ? AND ? UNION ALL SELECT monto FROM ofrendas WHERE fecha BETWEEN ? AND ? UNION ALL SELECT monto FROM primicias WHERE fecha BETWEEN ? AND ?)`, [d, h, d, h, d, h]);
    const egresos = await query('SELECT IFNULL(SUM(monto), 0) as total FROM egresos WHERE fecha BETWEEN ? AND ?', [d, h]);
    const diezmos = await query('SELECT IFNULL(SUM(monto), 0) as total FROM diezmos WHERE fecha BETWEEN ? AND ?', [d, h]);
    const ofrendas = await query('SELECT IFNULL(SUM(monto), 0) as total FROM ofrendas WHERE fecha BETWEEN ? AND ?', [d, h]);
    const primicias = await query('SELECT IFNULL(SUM(monto), 0) as total FROM primicias WHERE fecha BETWEEN ? AND ?', [d, h]);
    res.json({
      total_ingresos: ingresos.rows[0].total, total_egresos: egresos.rows[0].total,
      balance: ingresos.rows[0].total - egresos.rows[0].total,
      total_diezmos: diezmos.rows[0].total, total_ofrendas: ofrendas.rows[0].total,
      total_primicias: primicias.rows[0].total,
    });
  } catch (error) { next(error); }
});

router.get('/reports/monthly', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT strftime('%Y-%m', fecha) as mes,
        SUM(CASE WHEN tipo = 'diezmo' THEN monto ELSE 0 END) as total_diezmos,
        SUM(CASE WHEN tipo = 'ofrenda' THEN monto ELSE 0 END) as total_ofrendas,
        SUM(CASE WHEN tipo = 'primicia' THEN monto ELSE 0 END) as total_primicias,
        SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) as total_egresos
      FROM (
        SELECT fecha, monto, 'diezmo' as tipo FROM diezmos
        UNION ALL SELECT fecha, monto, 'ofrenda' FROM ofrendas
        UNION ALL SELECT fecha, monto, 'primicia' FROM primicias
        UNION ALL SELECT fecha, monto, 'egreso' FROM egresos
      )
      GROUP BY mes ORDER BY mes DESC LIMIT 12`);
    res.json(result.rows);
  } catch (error) { next(error); }
});

// REPORTE DE TESORERÍA POR CULTO
router.get('/reports/treasury/:id', authorize('administrador', 'pastor', 'secretaria'), async (req, res, next) => {
  try {
    const sid = req.params.id;
    const servicio = (await query('SELECT * FROM servicios WHERE id = ?', [sid])).rows[0];
    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });

    const diezmos = await query(
      `SELECT d.*, m.nombre, m.apellido, m.cedula FROM diezmos d LEFT JOIN miembros m ON d.miembro_id = m.id WHERE d.servicio_id = ? OR (d.servicio_id IS NULL AND d.fecha = ?) ORDER BY m.apellido, m.nombre`, [sid, servicio.fecha]);
    const ofrendas = await query(
      `SELECT * FROM ofrendas WHERE servicio_id = ? OR (servicio_id IS NULL AND fecha = ?) ORDER BY created_at`, [sid, servicio.fecha]);
    const primicias = await query(
      `SELECT p.*, m.nombre, m.apellido, m.cedula FROM primicias p LEFT JOIN miembros m ON p.miembro_id = m.id WHERE p.fecha = ?`, [servicio.fecha]);

    const montoOfrenda = ofrendas.rows.reduce((a, o) => a + o.monto, 0);
    const montoDiezmos = diezmos.rows.reduce((a, d) => a + d.monto, 0);
    const montoPrimicias = primicias.rows.reduce((a, p) => a + p.monto, 0);

    // Group diezmos by person for the detail table
    const contribMap = {};
    diezmos.rows.forEach(d => {
      const key = d.miembro_id || 'anon-' + crypto.randomUUID();
      if (!contribMap[key]) contribMap[key] = { nombre: d.nombre ? `${d.nombre} ${d.apellido}` : 'Anónimo', cedula: d.cedula || '', diezmo: 0, promesa: 0, pro_const: 0, departamento: 0, ministros: 0, pastoral: 0, primicia: 0 };
      contribMap[key].diezmo += d.monto;
    });
    primicias.rows.forEach(p => {
      const key = p.miembro_id || 'anon-p-' + crypto.randomUUID();
      if (!contribMap[key]) contribMap[key] = { nombre: p.nombre ? `${p.nombre} ${p.apellido}` : 'Anónimo', cedula: p.cedula || '', diezmo: 0, promesa: 0, pro_const: 0, departamento: 0, ministros: 0, pastoral: 0, primicia: 0 };
      contribMap[key].primicia += p.monto;
    });

    const contributions = Object.values(contribMap);
    const subtotals = ['diezmo', 'promesa', 'pro_const', 'departamento', 'ministros', 'pastoral', 'primicia'].map(k =>
      contributions.reduce((a, c) => a + (c[k] || 0), 0)
    );
    const total = subtotals.reduce((a, s) => a + s, 0);

    const date = new Date(servicio.fecha);
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const fechaTexto = `${dias[date.getDay()]}, ${date.getDate()} de ${meses[date.getMonth()]}, ${date.getFullYear()}`;

    const pdfData = {
      servicio,
      fechaTexto,
      concepts: {
        ofrenda: montoOfrenda,
        diezmos: montoDiezmos,
        primicia: montoPrimicias,
      },
      total: montoOfrenda + montoDiezmos + montoPrimicias,
      contributions,
      subtotals,
    };

    const pdf = await generateTreasuryReportPDF(pdfData);
    const fechaStr = servicio.fecha.replace(/-/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=tesoreria-${fechaStr}.pdf`);
    res.send(pdf);
  } catch (error) { next(error); }
});

// INFORME MENSUAL DE IGLESIA LOCAL
router.get('/reports/monthly-report', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const { mes, anio, iglesia, provincia, pastor } = req.query;
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const numMes = meses.indexOf((mes || '').toLowerCase()) + 1;
    const anioVal = anio || new Date().getFullYear();
    const fechaStart = `${anioVal}-${String(numMes).padStart(2,'0')}-01`;
    const lastDay = new Date(anioVal, numMes, 0).getDate();
    const fechaEnd = `${anioVal}-${String(numMes).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

    // Query financial data for the month
    const totalDiezmos = (await query(
      `SELECT IFNULL(SUM(monto),0) as total FROM diezmos WHERE fecha BETWEEN ? AND ?`, [fechaStart, fechaEnd])).rows[0].total;
    const totalOfrendas = (await query(
      `SELECT IFNULL(SUM(monto),0) as total FROM ofrendas WHERE fecha BETWEEN ? AND ?`, [fechaStart, fechaEnd])).rows[0].total;
    const totalPrimicias = (await query(
      `SELECT IFNULL(SUM(monto),0) as total FROM primicias WHERE fecha BETWEEN ? AND ?`, [fechaStart, fechaEnd])).rows[0].total;
    const totalEgresos = (await query(
      `SELECT IFNULL(SUM(monto),0) as total FROM egresos WHERE fecha BETWEEN ? AND ?`, [fechaStart, fechaEnd])).rows[0].total;

    // Services in the month
    const servicios = await query(
      `SELECT tipo, fecha, titulo, predicador FROM servicios WHERE fecha BETWEEN ? AND ? ORDER BY fecha`, [fechaStart, fechaEnd]);

    // Attendance averages
    const asistencias = await query(
      `SELECT s.tipo, COUNT(a.id) as presentes FROM servicios s LEFT JOIN asistencia_servicio a ON a.servicio_id = s.id AND a.estado='presente'
       WHERE s.fecha BETWEEN ? AND ? GROUP BY s.id`, [fechaStart, fechaEnd]);
    const avgAsistencia = asistencias.rows.length > 0
      ? Math.round(asistencias.rows.reduce((s, r) => s + r.presentes, 0) / asistencias.rows.length)
      : 0;

    // Build data object merging query params with calculated data
    const pdfData = {
      iglesia: iglesia || '',
      provincia: provincia || '',
      pastor: pastor || '',
      mes: mes || '',
      anio: String(anioVal),
      fecha_captura: new Date().toLocaleDateString('es-ES'),
      diezmos_congregacionales: totalDiezmos,
      ofrendas_generales: totalOfrendas,
      total_ingresos: totalDiezmos + totalOfrendas + totalPrimicias,
      total_egresos: totalEgresos,
      asistencia_semana: avgAsistencia,
      asistencia_dominical: avgAsistencia,
      ...req.query, // allow overrides
    };

    const pdf = await generateMonthlyReportPDF(pdfData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=informe-mensual-${mes || ''}-${anioVal}.pdf`);
    res.send(pdf);
  } catch (error) { next(error); }
});

router.get('/export/pdf', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const desde = req.query.desde || `${new Date().getFullYear()}-01-01`;
    const hasta = req.query.hasta || new Date().toISOString().split('T')[0];
    const ingresos = await query(
      `SELECT 'Diezmo' as tipo, fecha, monto, d.metodo_pago, m.nombre || ' ' || m.apellido as persona FROM diezmos d LEFT JOIN miembros m ON d.miembro_id = m.id WHERE d.fecha BETWEEN ? AND ?
       UNION ALL SELECT 'Ofrenda', fecha, monto, metodo_pago, donante_nombre FROM ofrendas WHERE fecha BETWEEN ? AND ?
       UNION ALL SELECT 'Primicia', fecha, monto, metodo_pago, m2.nombre || ' ' || m2.apellido FROM primicias p LEFT JOIN miembros m2 ON p.miembro_id = m2.id WHERE p.fecha BETWEEN ? AND ?
       ORDER BY fecha`,
      [desde, hasta, desde, hasta, desde, hasta]);
    const egresos = await query(
      `SELECT e.*, c.nombre as categoria FROM egresos e LEFT JOIN categorias_egresos c ON e.categoria_id = c.id WHERE e.fecha BETWEEN ? AND ? ORDER BY fecha`,
      [desde, hasta]);
    let html = `<h1>Reporte Financiero</h1><p>Período: ${desde} al ${hasta}</p>`;
    html += `<h2>Ingresos</h2><table border="1" cellpadding="6"><tr><th>Fecha</th><th>Tipo</th><th>Persona</th><th>Monto</th><th>Método</th></tr>`;
    ingresos.rows.forEach(i => { html += `<tr><td>${i.fecha}</td><td>${i.tipo}</td><td>${i.persona || ''}</td><td>$${i.monto.toFixed(2)}</td><td>${i.metodo_pago}</td></tr>`; });
    html += `</table><h2>Egresos</h2><table border="1" cellpadding="6"><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Monto</th></tr>`;
    egresos.rows.forEach(e => { html += `<tr><td>${e.fecha}</td><td>${e.categoria || ''}</td><td>${e.descripcion}</td><td>$${e.monto.toFixed(2)}</td></tr>`; });
    html += `</table>`;
    const pdf = await generatePDF(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte-financiero.pdf');
    res.send(pdf);
  } catch (error) { next(error); }
});

router.get('/export/excel', authorize('administrador', 'pastor'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT fecha, 'Diezmo' as tipo, monto, metodo_pago, m.nombre || ' ' || m.apellido as referencia FROM diezmos d LEFT JOIN miembros m ON d.miembro_id = m.id
       UNION ALL SELECT fecha, 'Ofrenda', monto, metodo_pago, donante_nombre FROM ofrendas
       UNION ALL SELECT fecha, 'Primicia', monto, metodo_pago, m2.nombre || ' ' || m2.apellido FROM primicias p LEFT JOIN miembros m2 ON p.miembro_id = m2.id
       UNION ALL SELECT fecha, 'Egreso', monto, metodo_pago, descripcion FROM egresos ORDER BY fecha`);
    const buffer = await generateExcel({ data: result.rows, columns: getFinancesExcelColumns(), title: 'Reporte Financiero', sheetName: 'Finanzas' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte-financiero.xlsx');
    res.send(buffer);
  } catch (error) { next(error); }
});

export default router;
