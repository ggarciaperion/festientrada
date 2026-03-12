import QRCode from 'qrcode';

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrDataURL = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });
    return qrDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

export function generateEntryURL(entryId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/validar/${entryId}`;
  }
  return `https://festival-cubanada.com/validar/${entryId}`;
}
