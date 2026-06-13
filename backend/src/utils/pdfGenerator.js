import PDFDocument from 'pdfkit';

export function generatePDF(html) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(10);
      doc.text(html, { align: 'left' });
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function generateTreasuryReportPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pageWidth = doc.page.width - 100;
      const leftX = 50;
      const rightX = pageWidth + 50;

      // === PAGE 1: INFORME DE TESORERÍA ===

      // Church name
      doc.fontSize(18).font('Helvetica-Bold').text('Templo Puerta del Cielo del Evangelio Cuadrangular', { align: 'center' });
      doc.moveDown(0.3);

      // Title
      doc.fontSize(14).font('Helvetica-Bold').text('INFORME DE TESORERÍA', { align: 'center' });
      doc.moveDown(0.5);

      // Date
      doc.fontSize(10).font('Helvetica').text(data.fechaTexto || '', { align: 'center' });
      doc.moveDown(0.8);

      // Service info
      if (data.servicio) {
        doc.fontSize(9).font('Helvetica-Oblique').text(`Servicio: ${data.servicio.tipo} - ${data.servicio.titulo || ''}`, { align: 'center' });
        if (data.servicio.predicador) {
          doc.text(`Predicador: ${data.servicio.predicador}`, { align: 'center' });
        }
        doc.moveDown(0.5);
      }

      // Concepts table
      const concepts = [
        { label: 'Ofrenda', key: 'ofrenda' },
        { label: 'Diezmos', key: 'diezmos' },
        { label: 'Escuela Dominical', key: 'escuela_dominical' },
        { label: 'Promesa de Fe - Misionera', key: 'promesa_fe' },
        { label: 'Pro Templo - Construcción y Mejoras', key: 'pro_templo' },
        { label: 'Pastoral', key: 'pastoral' },
        { label: 'Ministros con Credencial N.', key: 'ministros' },
        { label: 'Ofrenda-Local-Comedor', key: 'comedor' },
        { label: 'Diezmo Departamento', key: 'diezmo_departamento' },
        { label: 'Ofrenda Obra el Límite', key: 'obra_limite' },
        { label: 'Otros: Alquiler', key: 'alquiler' },
        { label: 'Primicia', key: 'primicia' },
        { label: 'Otros: Voluntaria', key: 'voluntaria' },
      ];

      // Draw concept lines
      doc.fontSize(10).font('Helvetica');
      let y = doc.y;
      const lineHeight = 22;

      concepts.forEach(c => {
        const amount = data.concepts[c.key] || 0;
        const formatted = `B/. ${amount.toFixed(2)}`;

        doc.font('Helvetica').text(c.label, leftX, y, { width: pageWidth - 80, align: 'left' });
        doc.font('Helvetica-Bold').text(formatted, leftX + pageWidth - 70, y, { width: 70, align: 'right' });

        // Underline
        doc.moveTo(leftX, y + 14).lineTo(rightX, y + 14).strokeColor('#cccccc').stroke();
        doc.strokeColor('#000000');

        y += lineHeight;
      });

      doc.moveDown(0.5);

      // Total
      y = doc.y + 5;
      doc.moveTo(leftX, y).lineTo(rightX, y).lineWidth(2).stroke();
      doc.lineWidth(1);
      doc.moveDown(0.3);

      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('TOTAL B/', leftX, doc.y, { continued: true });
      doc.text(`B/. ${(data.total || 0).toFixed(2)}`, { align: 'right' });

      doc.moveDown(1.5);

      // Signatures
      y = doc.y;
      doc.fontSize(10).font('Helvetica');
      doc.text('REALIZADO POR:', leftX, y);
      doc.moveTo(leftX + 100, y + 2).lineTo(rightX, y + 2).stroke();
      doc.moveDown(0.8);

      y = doc.y;
      doc.text('REVISADO POR:', leftX, y);
      doc.moveTo(leftX + 100, y + 2).lineTo(rightX, y + 2).stroke();
      doc.fontSize(9).font('Helvetica-Bold').text('TESORERÍA', rightX - 60, y + 5, { align: 'right' });
      doc.moveDown(0.8);

      doc.fontSize(10).font('Helvetica');
      for (let i = 0; i < 2; i++) {
        y = doc.y;
        doc.moveTo(leftX, y + 2).lineTo(rightX, y + 2).stroke();
        doc.moveDown(0.8);
      }

      doc.moveDown(1);

      // Notes box
      y = doc.y;
      const boxHeight = 60;
      doc.roundedRect(leftX, y, pageWidth, boxHeight, 5).stroke();
      doc.fontSize(9).font('Helvetica-Bold').text('NOTA:', leftX + 8, y + 5);
      doc.fontSize(9).font('Helvetica').text('', leftX + 8, y + 20);

      doc.addPage();

      // === PAGE 2: REGISTRO DE CONTRIBUCIONES ===

      doc.fontSize(14).font('Helvetica-Bold').text('Registro de Contribuciones', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').text(`Servicio: ${data.servicio?.tipo || ''} - ${data.servicio?.fecha || ''}`, { align: 'center' });
      doc.moveDown(0.8);

      // Table headers
      const cols = [
        { label: 'N°', width: 20 },
        { label: 'Nombre', width: 80 },
        { label: 'Cédula', width: 70 },
        { label: 'Diezmos', width: 55 },
        { label: 'Promesa', width: 55 },
        { label: 'Pro-Const.', width: 55 },
        { label: 'Dpto.', width: 50 },
        { label: 'Ministros', width: 55 },
        { label: 'Pastoral', width: 55 },
        { label: 'Primicia', width: 55 },
      ];

      const tableLeft = 30;
      const tableWidth = cols.reduce((sum, c) => sum + c.width, 0);
      let tableY = doc.y;

      // Header row
      doc.fontSize(7).font('Helvetica-Bold');
      let x = tableLeft;
      cols.forEach(c => {
        doc.rect(x, tableY, c.width, 16).stroke();
        doc.text(c.label, x + 1, tableY + 4, { width: c.width - 2, align: 'center' });
        x += c.width;
      });

      tableY += 16;

      // Data rows
      doc.fontSize(7).font('Helvetica');
      (data.contributions || []).forEach((row, i) => {
        x = tableLeft;
        const rowH = 14;
        const bg = i % 2 === 0 ? '#f2f2f2' : '#ffffff';

        const values = [
          String(i + 1),
          row.nombre || '',
          row.cedula || '',
          row.diezmo ? `B/. ${row.diezmo.toFixed(2)}` : '',
          row.promesa ? `B/. ${row.promesa.toFixed(2)}` : '',
          row.pro_const ? `B/. ${row.pro_const.toFixed(2)}` : '',
          row.departamento ? `B/. ${row.departamento.toFixed(2)}` : '',
          row.ministros ? `B/. ${row.ministros.toFixed(2)}` : '',
          row.pastoral ? `B/. ${row.pastoral.toFixed(2)}` : '',
          row.primicia ? `B/. ${row.primicia.toFixed(2)}` : '',
        ];

        cols.forEach((c, ci) => {
          doc.rect(x, tableY, c.width, rowH).fillAndStroke(bg, '#000000');
          doc.fillColor('#000000');
          doc.text(values[ci] || '', x + 1, tableY + 3, { width: c.width - 2, align: ci === 0 ? 'center' : 'left' });
          x += c.width;
        });

        tableY += rowH;
      });

      // Subtotal row
      doc.fontSize(7).font('Helvetica-Bold');
      x = tableLeft;
      const subY = tableY;
      cols.forEach((c, ci) => {
        doc.rect(x, subY, c.width, 16).fillAndStroke('#d4edda', '#000000');
        doc.fillColor('#000000');
        const val = ci === 0 ? '' : ci === 1 ? 'SUB-TOTAL' : ci === 2 ? '' : data.subtotals ? `B/. ${(data.subtotals[ci - 3] || 0).toFixed(2)}` : '';
        doc.text(val, x + 1, subY + 4, { width: c.width - 2, align: ci <= 1 ? 'left' : 'right' });
        x += c.width;
      });

      tableY = subY + 16;

      // Grand total row
      doc.fontSize(8).font('Helvetica-Bold');
      x = tableLeft;
      const grandY = tableY;
      cols.forEach((c, ci) => {
        doc.rect(x, grandY, c.width, 18).fillAndStroke('#c3e6cb', '#000000');
        doc.fillColor('#000000');
        const val = ci === 0 ? '' : ci === 1 ? 'GRAN TOTAL' : ci === 2 ? '' : ci === 3 ? `B/. ${(data.total || 0).toFixed(2)}` : '';
        doc.text(val, x + 1, grandY + 5, { width: c.width - 2, align: ci <= 1 ? 'left' : 'right' });
        x += c.width;
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function generateMonthlyReportPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'LETTER' });
      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pw = doc.page.width - 60;
      const lx = 30;

      // === HEADER ===
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e3a5f').text('IGLESIA INTERNACIONAL DEL EVANGELIO CUADRANGULAR', { align: 'center' });
      doc.fontSize(7).font('Helvetica').fillColor('#333').text('Apartado 1772, Panamá 1, Panamá — Teléfono 263-6074', { align: 'center' });
      doc.moveDown(0.5);
      // Title box
      const titleY = doc.y;
      doc.rect(lx, titleY, pw, 22).fill('#1e3a5f');
      doc.fillColor('#ffffff').fontSize(13).font('Helvetica-Bold').text('INFORME MENSUAL DE LA IGLESIA LOCAL', lx, titleY + 4, { align: 'center', width: pw });
      doc.fillColor('#000');
      doc.y = titleY + 26;
      doc.moveDown(0.2);

      if (data.validado) {
        doc.fontSize(7).font('Helvetica-Oblique').fillColor('#2563eb')
          .text('El Pastor ha validado el informe y lo envió a la sede provincial. Correo de validación enviado satisfactoriamente.', { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(0.3);
      }

      const col1X = lx;
      const col2X = lx + pw / 2 + 5;
      const colW = pw / 2 - 8;

      function sectionTitle(text, x, y, w) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
        doc.rect(x, y, w, 14).fill('#1e3a5f');
        doc.fillColor('#ffffff').text(text, x + 3, y + 3, { width: w - 6 });
        doc.fillColor('#000000');
        return y + 14;
      }

      function fieldRow(num, label, value, x, y, w, isTotal) {
        const rh = isTotal ? 16 : 13;
        const f = isTotal ? 'Helvetica-Bold' : 'Helvetica';
        const fs = isTotal ? 7 : 6.5;
        doc.rect(x, y, w, rh).stroke();
        doc.fontSize(6).font('Helvetica').fillColor('#666').text(String(num), x + 2, y + 3, { width: 12 });
        doc.fontSize(fs).font(f).fillColor('#000').text(label, x + 14, y + 3, { width: w - 65 });
        if (value !== undefined) {
          doc.fontSize(fs).font(f).text(typeof value === 'string' ? value : `B/. ${value.toFixed(2)}`, x + w - 50, y + 3, { width: 46, align: 'right' });
        }
        return y + rh;
      }

      function sectionLabel(text, x, y, w) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#1e3a5f').text(text, x + 2, y + 2, { width: w - 4 });
        doc.fillColor('#000');
        return y + 13;
      }

      // === SECTION I: DATOS DE LA IGLESIA (1-9) ===
      let yPos = doc.y;
      yPos = sectionTitle('SECCIÓN I — DATOS DE LA IGLESIA', lx, yPos, pw);
      const fields1 = [
        [1, 'Iglesia', data.iglesia || 'Templo Puerta del Cielo'],
        [2, 'Provincia / Pastor', `${data.provincia || ''} / ${data.pastor || ''}`],
        [3, 'Zona / Pastor de Zona', `${data.zona || ''} / ${data.pastorZona || ''}`],
        [4, 'Id / Distrito Cuadrangular', `${data.id_distrito || ''} / ${data.distrito || ''}`],
        [5, 'Dirección / Distrito', `${data.direccion || ''} / ${data.distrito_dir || ''}`],
        [6, 'Corregimiento', data.corregimiento || ''],
        [7, 'Teléfono', data.telefono || ''],
        [8, 'Mes Reportado', data.mes || ''],
        [9, 'Año Reportado', data.anio || ''],
      ];
      fields1.forEach(([n, l, v]) => { yPos = fieldRow(n, l, v, lx, yPos, pw); });

      // === SECTION II: ESTADÍSTICA FIJA (10-12) ===
      yPos = sectionTitle('SECCIÓN II — ESTADÍSTICA FIJA', lx, yPos, pw);
      [[10, 'Número de Miembros Registrados', data.miembros_registrados],
       [11, 'Número de Puntos de Predicación', data.puntos_predicacion],
       [12, 'Reuniones No destinadas a ser Iglesias', data.reuniones_no_iglesia],
      ].forEach(([n, l, v]) => { yPos = fieldRow(n, l, v, lx, yPos, pw); });

      // === SECTION III: MIGRACIÓN (13-18) ===
      yPos = sectionTitle('SECCIÓN III — MIGRACIÓN', lx, yPos, pw);
      [[13, 'Recibidos de Otras Iglesias Cuadrangulares', data.recibidos_cuadrangular],
       [14, 'Idos a Otras Iglesias Cuadrangulares', data.idos_cuadrangular],
       [15, 'Recibidos de Otras Iglesias Evangélicas', data.recibidos_evangelica],
       [16, 'Idos a Otras Iglesias Evangélicas', data.idos_evangelica],
       [17, 'Idos al Mundo o se desconoce el paradero', data.idos_mundo],
       [18, 'Defunciones de Creyentes', data.defunciones],
      ].forEach(([n, l, v]) => { yPos = fieldRow(n, l, v, lx, yPos, pw); });

      // === SECTION IV: PROMEDIO DE ASISTENCIA (19-22) ===
      yPos = sectionTitle('SECCIÓN IV — PROMEDIO DE ASISTENCIA', lx, yPos, pw);
      [[19, 'Asistencia a Cultos de la semana', data.asistencia_semana],
       [20, 'Asistencia a Cultos Dominicales', data.asistencia_dominical],
       [21, 'Asistencia a Escuela Dominical', data.asistencia_escuela],
       [22, 'Asistencia a Ptos. de Predicación', data.asistencia_puntos],
      ].forEach(([n, l, v]) => { yPos = fieldRow(n, l, v, lx, yPos, pw); });

      // === SECTION V: RESULTADOS ESPIRITUALES (23-29) ===
      yPos = sectionTitle('SECCIÓN V — RESULTADOS ESPIRITUALES', lx, yPos, pw);
      [[23, 'Decisiones de fe / Reconciliaciones', data.decisiones_fe],
       [24, 'Bautizados en Agua', data.bautizados_agua],
       [25, 'Bautizados en Espíritu Santo', data.bautizados_espiritu],
       [26, 'Sanidades (Estimadas)', data.sanidades],
       [27, 'Liberaciones', data.liberaciones],
       [28, 'Niños Dedicados', data.ninos_dedicados],
      ].forEach(([n, l, v]) => { yPos = fieldRow(n, l, v, lx, yPos, pw); });

      const obsY = yPos;
      doc.rect(lx, obsY, pw, 32).stroke();
      doc.fontSize(6).font('Helvetica').fillColor('#666').text('29', lx + 2, obsY + 2, { width: 12 });
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000').text('Observaciones', lx + 14, obsY + 2, { width: pw - 20 });
      doc.fontSize(6.5).font('Helvetica').text(data.observaciones || '', lx + 14, obsY + 14, { width: pw - 20 });
      yPos = obsY + 32;

      if (yPos > doc.page.height - 180) { doc.addPage(); yPos = 40; }

      // === SECTION VI: FINANZAS ===
      yPos = sectionTitle('SECCIÓN VI — FINANZAS DE LA IGLESIA LOCAL', lx, yPos, pw);

      const finTop = yPos;
      let colY = finTop;

      // LEFT: INGRESOS (30-46)
      colY = sectionLabel('INGRESOS', col1X, colY, colW);
      const ingresos = [
        [30, 'Diezmos Congregacionales', data.diezmos_congregacionales],
        [31, 'Ofrendas Generales', data.ofrendas_generales],
        [32, 'Diezmos Pastorales Ministeriales', data.diezmos_pastorales_min],
        [33, 'Diezmos Pastorales Personales', data.diezmos_pastorales_per],
        [34, 'Diezmos de Ministros con Credencial', data.diezmos_ministros],
        [35, 'Ofrenda Misionera', data.ofrenda_misionera],
        [36, 'Ofrenda mi aporte misionero', data.aporte_misionero],
        [37, 'Ofrenda de Escuela Dominical', data.ofrenda_escuela],
        [38, 'Aportes a la Escuela Dominical no retenidas', data.aportes_escuela],
        [39, 'Ofrendas Ministeriales', data.ofrendas_ministeriales],
        [40, 'Diezmos Ministeriales', data.diezmos_ministeriales],
        [41, 'Pro Construcción y Mejoras', data.pro_construccion],
        [42, 'S.S. Empleado', data.ss_empleado],
        [43, 'S.S. Empleado retenido en provincia', data.ss_empleado_retenido],
        [44, 'Donaciones', data.donaciones],
        [45, 'Otras Ofrendas u Ofrendas', data.otras_ofrendas],
      ];
      ingresos.forEach(([n, l, v]) => { colY = fieldRow(n, l, v, col1X, colY, colW); });
      colY = fieldRow(46, 'TOTAL DE INGRESOS', data.total_ingresos, col1X, colY, colW, true);

      // RIGHT: EGRESOS (47-63)
      let col2Y = finTop;
      if (yPos > finTop) { col2Y = finTop; }
      col2Y = sectionLabel('EGRESOS', col2X, col2Y, colW);
      const egresos = [
        [47, 'Pago total de este informe', data.pago_total],
        [48, 'Ayuda al Pastor', data.ayuda_pastor],
        [49, 'Décimo Tercer mes', data.decimo_tercer],
        [50, 'Vacaciones del Pastor', data.vacaciones_pastor],
        [51, 'Ofrendas/Ayudas a Miembros c/Cred. Nac.', data.ofrendas_miembros_cred],
        [52, 'Ofrenda/Ayuda a otros Minist. c/Cred. Nac.', data.ofrendas_ministros_cred],
        [53, 'Ayuda/Sueldo al Personal de Iglesia', data.ayuda_personal],
        [54, 'Terrenos', data.terrenos],
        [55, 'Mantenimiento del Templo', data.mantenimiento_templo],
        [56, 'Construcción, Mejoras', data.construccion_mejoras],
        [57, 'Inversiones Misioneras', data.inversiones_misioneras],
        [58, 'Gastos de Ministerios Cuadrangulares', data.gastos_ministerios],
        [59, 'Gastos de la Obra Pastoral (Convención)', data.gastos_obra_pastoral],
        [60, 'Otros Gastos o Ayudas al Pastor', data.otros_gastos_pastor],
        [61, 'Luz / Agua / Teléfono / Internet', data.luz_agua_tel],
        [62, 'Otros Gastos Adm/Compras Bienes', data.otros_gastos_adm],
      ];
      egresos.forEach(([n, l, v]) => { col2Y = fieldRow(n, l, v, col2X, col2Y, colW); });
      col2Y = fieldRow(63, 'TOTAL DE EGRESOS', data.total_egresos, col2X, col2Y, colW, true);

      // SALDOS (64-67)
      const saldosY = Math.max(colY, col2Y) + 2;
      let salY = saldosY;
      salY = sectionLabel('SALDOS', col1X, salY, colW);
      [[64, 'Saldo Anterior', data.saldo_anterior],
       [65, 'Resultado del Mes', data.resultado_mes],
      ].forEach(([n, l, v]) => { salY = fieldRow(n, l, v, col1X, salY, colW); });
      salY = fieldRow(66, 'Nuevo Saldo en Caja/Banco', data.nuevo_saldo, col1X, salY, colW, true);
      salY = fieldRow(67, 'Otros Detalles', undefined, col1X, salY, colW);

      yPos = Math.max(salY, col2Y);

      if (yPos > doc.page.height - 200) { doc.addPage(); yPos = 40; }

      // === SECTION VII: APORTES A LA DENOMINACIÓN (68-101) ===
      yPos = sectionTitle('SECCIÓN VII — APORTES A LA DENOMINACIÓN', lx, yPos, pw);

      doc.fontSize(6).font('Helvetica-Bold');
      doc.rect(col1X, yPos, colW, 13).fill('#e5e7eb');
      doc.fillColor('#000').text('Concepto', col1X + 2, yPos + 2, { width: colW - 70 });
      doc.text('Diezmo', col1X + colW - 48, yPos + 2, { width: 22, align: 'center' });
      doc.text('Ofrenda', col1X + colW - 24, yPos + 2, { width: 22, align: 'center' });
      doc.rect(col2X, yPos, colW, 13).fill('#e5e7eb');
      doc.fillColor('#000').text('Concepto', col2X + 2, yPos + 2, { width: colW - 70 });
      doc.text('Diezmo', col2X + colW - 48, yPos + 2, { width: 22, align: 'center' });
      doc.text('Ofrenda', col2X + colW - 24, yPos + 2, { width: 22, align: 'center' });
      yPos += 14;

      function aporteRow(num, label, diezmo, ofrenda, x, y, w, isTotal) {
        const rh = isTotal ? 16 : 13;
        const f = isTotal ? 'Helvetica-Bold' : 'Helvetica';
        const fs = isTotal ? 7 : 6.5;
        doc.rect(x, y, w, rh).stroke();
        doc.fontSize(6).font('Helvetica').fillColor('#666').text(String(num), x + 1, y + 2, { width: 10 });
        doc.fontSize(fs).font(f).fillColor('#000').text(label, x + 12, y + 2, { width: w - 68 });
        if (diezmo !== undefined) doc.fontSize(fs).font(f).text(diezmo.toFixed(2), x + w - 48, y + 2, { width: 22, align: 'right' });
        if (ofrenda !== undefined) doc.fontSize(fs).font(f).text(ofrenda.toFixed(2), x + w - 24, y + 2, { width: 22, align: 'right' });
        return y + rh;
      }

      let a1Y = yPos, a2Y = yPos;

      // LEFT COLUMN APORTES
      a1Y = aporteRow(68, 'Diezmo de Diezmos y Ofrendas', data.diezmo_diezmos, data.ofrenda_diezmos, col1X, a1Y, colW);
      a1Y = aporteRow(69, 'Diezmos Ministeriales del Pastor', data.diezmos_min_pastor, undefined, col1X, a1Y, colW);
      a1Y = aporteRow(70, 'Diezmos Pastorales Personales', data.diezmos_past_per, undefined, col1X, a1Y, colW);
      a1Y = aporteRow(71, 'Diezmos de Ministros con Cred.', data.diezmos_min_cred, undefined, col1X, a1Y, colW);
      a1Y = aporteRow(72, 'Inversiones Nacionales', data.inversiones_nac, undefined, col1X, a1Y, colW);
      a1Y = aporteRow(73, 'Aporte a Campamentos (2%)', data.aporte_campamentos, undefined, col1X, a1Y, colW);
      a1Y = sectionLabel('DIRECCIÓN NACIONAL DE MISIONES:', col1X, a1Y, colW);
      a1Y = aporteRow(74, 'Ofrenda Misionera', undefined, data.ofrenda_misionera_ap, col1X, a1Y, colW);
      a1Y = aporteRow(75, 'Ofrenda Mi aporte Misionero', undefined, data.aporte_misionero_ap, col1X, a1Y, colW);
      a1Y = aporteRow(76, 'Otros Aportes Misioneros', undefined, data.otros_ap_misioneros, col1X, a1Y, colW);

      // RIGHT COLUMN: MINISTERIOS (77-101)
      a2Y = sectionLabel('MINISTERIOS (77-101):', col2X, a2Y, colW);
      const minRows = [
        [77, 'a. Escuela Dominical', data.ap_escuela_diezmo, data.ap_escuela_ofrenda],
        [78, 'Otros diezmos a la Escuela Dominical', data.ap_otros_escuela, undefined],
        [79, 'b. Ministerio de Mujeres', data.ap_mujeres_diezmo, data.ap_mujeres_ofrenda],
        [80, 'c. Alabastro', data.ap_alabastro_diezmo, data.ap_alabastro_ofrenda],
        [81, 'd. Ministerio de Varones', data.ap_varones_diezmo, data.ap_varones_ofrenda],
        [82, 'e. Ministerio de Jóvenes', data.ap_jovenes_diezmo, data.ap_jovenes_ofrenda],
        [83, 'f. Ministerio de Adolescentes', data.ap_adolescentes_diezmo, data.ap_adolescentes_ofrenda],
        [84, 'g. Ministerio de Niños', data.ap_ninos_diezmo, data.ap_ninos_ofrenda],
        [85, 'h. Ministerio de Águilas', data.ap_aguilas_diezmo, data.ap_aguilas_ofrenda],
        [86, 'i. Ministerio de Familia', data.ap_familia_diezmo, data.ap_familia_ofrenda],
        [87, 'j. Ministerio de Intercesión', data.ap_intercesion_diezmo, data.ap_intercesion_ofrenda],
        [88, 'k. Ministerio a las Cárceles', data.ap_carceles_diezmo, data.ap_carceles_ofrenda],
        [89, 'L. Otros Ministerios', data.ap_otros_min_diezmo, data.ap_otros_min_ofrenda],
        [90, 'Pago o reembolso a la Nacional', data.pago_nacional, undefined],
        [91, 'Congreso', data.congreso_diezmo, data.congreso_ofrenda],
        [92, 'Convención', data.convencion_diezmo, data.convencion_ofrenda],
        [93, 'Credencial', data.credencial, undefined],
        [94, 'Fondo de Cesantía', data.fondo_cesantia, undefined],
        [95, 'Fondo de Apoyo Pastoral', data.fondo_apoyo_pastoral, undefined],
        [96, 'Seguro Social de Empleado', data.ss_empleado_ap, undefined],
        [97, 'Seguro Social del Patrono', data.ss_patrono, undefined],
        [98, 'S.S. de Empleado retenido en provincia', data.ss_empleado_ret_ap, undefined],
        [99, 'S.S. Patrono retenido en Provincia', data.ss_patrono_ret, undefined],
        [100, 'Otros Pagos', data.otros_pagos, undefined],
      ];
      minRows.forEach(([n, l, d, o]) => { a2Y = aporteRow(n, l, d, o, col2X, a2Y, colW); });
      a2Y = aporteRow(101, 'TOTAL DE ESTE PAGO', data.total_pago, undefined, col2X, a2Y, colW, true);

      yPos = Math.max(a1Y, a2Y) + 5;

      if (yPos > doc.page.height - 80) { doc.addPage(); yPos = 40; }

      // === SECTION VIII: VALIDACIÓN (102-105) ===
      yPos = sectionTitle('SECCIÓN VIII — VALIDACIÓN DEL INFORME MENSUAL', lx, yPos, pw);

      const sigH = 28;
      const sigW = (pw - 10) / 2;

      function sigField(num, label, name, x, y, w) {
        doc.rect(x, y, w, sigH).stroke();
        doc.fontSize(6).font('Helvetica').fillColor('#666').text(String(num), x + 2, y + 2, { width: 12 });
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000').text(label, x + 14, y + 2, { width: w - 20 });
        doc.fontSize(6).font('Helvetica').fillColor('#000').text(name || '________________________', x + 14, y + 14, { width: w - 20 });
        doc.fillColor('#000');
      }

      sigField(102, 'Pastor:', data.pastor_nombre, lx, yPos, sigW);
      sigField(103, 'Tesorero:', data.tesorero_nombre, lx + sigW + 10, yPos, sigW);
      yPos += sigH + 3;
      sigField(104, 'Recibido:', data.recibido_nombre, lx, yPos, sigW);
      doc.rect(lx + sigW + 10, yPos, sigW, sigH).stroke();
      doc.fontSize(6).font('Helvetica').fillColor('#666').text('105', lx + sigW + 12, yPos + 2, { width: 12 });
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000').text('Fecha de Captura:', lx + sigW + 24, yPos + 2, { width: sigW - 30 });
      doc.fontSize(6.5).font('Helvetica').text(data.fecha_captura || '', lx + sigW + 24, yPos + 14, { width: sigW - 30 });
      yPos += sigH + 3;

      yPos = doc.page.height - 30;
      doc.fontSize(7).font('Helvetica-Oblique').text(`Bienvenidos Provincia de: ${data.provincia || ''}`, lx, yPos, { align: 'center', width: pw });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
