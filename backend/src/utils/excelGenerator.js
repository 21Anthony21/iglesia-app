import ExcelJS from 'exceljs';

export async function generateExcel({ data, columns, title, sheetName }) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName || 'Sheet1');
  sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width || 20 }));
  data.forEach(row => sheet.addRow(row));
  return await workbook.xlsx.writeBuffer();
}

export function getFinancesExcelColumns() {
  return [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Tipo', key: 'tipo', width: 14 },
    { header: 'Monto', key: 'monto', width: 14 },
    { header: 'Método', key: 'metodo_pago', width: 14 },
    { header: 'Referencia', key: 'referencia', width: 30 },
  ];
}
