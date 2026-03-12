import { jsPDF } from 'jspdf';
import { Ticket } from './database';

export async function generateTicketPDF(ticket: Ticket, qrDataURL: string): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Fondo tropical degradado (simulado con rectángulos)
  doc.setFillColor(255, 107, 107); // Coral
  doc.rect(0, 0, pageWidth, 60, 'F');

  doc.setFillColor(78, 205, 196); // Teal
  doc.rect(0, 60, pageWidth, 60, 'F');

  doc.setFillColor(26, 26, 46); // Night
  doc.rect(0, 120, pageWidth, pageHeight - 120, 'F');

  // Header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('PRIMER FESTIVAL', pageWidth / 2, 25, { align: 'center' });
  doc.setFontSize(32);
  doc.text('CUBANADA', pageWidth / 2, 38, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Chancay 2026', pageWidth / 2, 50, { align: 'center' });

  // Información del evento
  doc.setFontSize(12);
  doc.text('📅 Fecha: Domingo 29 de Marzo, 2026', pageWidth / 2, 70, { align: 'center' });
  doc.text('📍 Malecón del Puerto de Chancay', pageWidth / 2, 78, { align: 'center' });
  doc.text('🎺 4 Artistas de Salsa + 1 DJ Local', pageWidth / 2, 86, { align: 'center' });

  // Línea divisoria
  doc.setDrawColor(255, 230, 109);
  doc.setLineWidth(0.5);
  doc.line(20, 95, pageWidth - 20, 95);

  // Información del comprador
  doc.setTextColor(255, 230, 109);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DE LA ENTRADA', pageWidth / 2, 110, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  let yPos = 125;
  doc.text(`Nombre: ${ticket.buyerName}`, 25, yPos);
  yPos += 8;
  doc.text(`DNI: ${ticket.buyerDNI}`, 25, yPos);
  yPos += 8;
  doc.text(`Email: ${ticket.buyerEmail}`, 25, yPos);
  yPos += 8;
  doc.text(`Teléfono: ${ticket.buyerPhone}`, 25, yPos);
  yPos += 8;
  doc.text(`Tipo de Entrada: ${ticket.ticketType.toUpperCase()}`, 25, yPos);
  yPos += 8;
  doc.text(`Cantidad: ${ticket.quantity} entrada(s)`, 25, yPos);
  yPos += 8;
  doc.text(`Total Pagado: S/ ${ticket.totalPrice.toFixed(2)}`, 25, yPos);
  yPos += 8;
  doc.text(`Orden: #${ticket.id.substring(0, 8)}`, 25, yPos);
  yPos += 8;
  doc.text(`Fecha de Compra: ${new Date(ticket.purchaseDate).toLocaleDateString('es-PE')}`, 25, yPos);

  // QR Code individual para cada entrada
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 230, 109);
  doc.text('CÓDIGOS QR DE VALIDACIÓN', pageWidth / 2, yPos, { align: 'center' });

  yPos += 10;

  // Renderizar cada entrada individual
  for (let i = 0; i < ticket.tickets.length; i++) {
    const entry = ticket.tickets[i];

    // Si hay más de 2 entradas, crear nueva página
    if (i > 0 && i % 2 === 0) {
      doc.addPage();
      doc.setFillColor(26, 26, 46);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      yPos = 20;
    }

    const qrSize = 50;
    const xPos = pageWidth / 2 - qrSize / 2;

    // Generar QR individual
    const entryQR = await import('./qr-generator').then(m => m.generateQRCode(entry.qrData));

    doc.addImage(entryQR, 'PNG', xPos, yPos, qrSize, qrSize);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Entrada ${i + 1} de ${ticket.quantity}`, pageWidth / 2, yPos + qrSize + 6, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`ID: ${entry.entryId.substring(0, 12)}...`, pageWidth / 2, yPos + qrSize + 11, { align: 'center' });

    yPos += qrSize + 20;
  }

  // Footer en última página
  const finalY = pageHeight - 20;
  doc.setFontSize(10);
  doc.setTextColor(255, 230, 109);
  doc.setFont('helvetica', 'italic');
  doc.text('Perion Entertainment', pageWidth / 2, finalY, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Presenta cada QR en la entrada | No reembolsable', pageWidth / 2, finalY + 5, { align: 'center' });

  // Descargar PDF
  doc.save(`ticket-cubanada-${ticket.id.substring(0, 8)}.pdf`);
}
