export async function sendEmail({ to, subject, html }) {
  console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
  return { messageId: 'simulated-' + Date.now() };
}

export function getTitheReceiptHTML({ nombre, fecha, monto, recibo_numero }) {
  return `
    <div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ccc;">
      <h2 style="text-align: center; color: #1e3a5f;">Iglesia Puerta Del Cielo</h2>
      <h3 style="text-align: center;">Recibo de Diezmo</h3>
      <p><strong>Recibo N°:</strong> ${recibo_numero}</p>
      <p><strong>Nombre:</strong> ${nombre}</p>
      <p><strong>Fecha:</strong> ${fecha}</p>
      <p><strong>Monto:</strong> B/. ${parseFloat(monto).toFixed(2)}</p>
      <hr/>
      <p style="text-align: center; color: #666; font-size: 12px;">Gracias por tu fidelidad</p>
    </div>`;
}
