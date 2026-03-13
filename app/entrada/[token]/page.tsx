import { notFound } from 'next/navigation';
import { verifyTicketToken } from '@/lib/tickets';

const ZONE_LABEL: Record<string, string> = {
  platinum: 'PLATINUM',
  vip:      'VIP',
  malecon:  'BOX MALECÓN',
  general:  'GENERAL',
};

const ZONE_COLOR: Record<string, string> = {
  platinum: '#a78bfa',
  vip:      '#34d399',
  malecon:  '#60a5fa',
  general:  '#94a3b8',
};

export default async function EntradaPage({
  params,
}: {
  params: { token: string };
}) {
  const token   = decodeURIComponent(params.token);
  const payload = verifyTicketToken(token);

  if (!payload) notFound();

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://festientrada.com';
  const qrUrl   = `${appUrl}/api/tickets/qr?token=${encodeURIComponent(token)}`;
  const zone    = ZONE_LABEL[payload.zone]  ?? payload.zone.toUpperCase();
  const color   = ZONE_COLOR[payload.zone]  ?? '#FACC15';
  const isBox   = payload.type === 'box';
  const qty     = isBox ? 10 : payload.qty;
  const qtyLabel = payload.zone === 'general'
    ? (qty === 1 ? '1 entrada'  : `${qty} entradas`)
    : (qty === 1 ? '1 pulsera'  : `${qty} pulseras`);

  const date = new Date(payload.ts).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <main
      style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex',
               alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 4px', color: '#888', fontSize: '11px',
                      letterSpacing: '4px', textTransform: 'uppercase',
                      fontFamily: 'Arial, sans-serif' }}>
            PERION ENTERTAINMENT
          </p>
          <h1 style={{ margin: '0', color: '#FACC15', fontSize: '28px',
                       fontWeight: 900, letterSpacing: '4px',
                       fontFamily: '"Arial Black", Arial, sans-serif',
                       textTransform: 'uppercase' }}>
            FESTIVAL CUBANADA
          </h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: '11px',
                      letterSpacing: '2px', fontFamily: 'Arial, sans-serif' }}>
            CHANCAY · LIMA · PERÚ · 29 MAR 2026
          </p>
        </div>

        {/* Ticket card */}
        <div style={{ background: '#111', border: `2px solid ${color}`,
                      borderRadius: '12px', overflow: 'hidden' }}>

          {/* Zone bar */}
          <div style={{ background: color, padding: '10px 20px', textAlign: 'center' }}>
            <span style={{ color: '#000', fontSize: '13px', fontWeight: 900,
                           letterSpacing: '3px', fontFamily: '"Arial Black", Arial, sans-serif',
                           textTransform: 'uppercase' }}>
              {zone}
            </span>
          </div>

          {/* QR section */}
          <div style={{ padding: '28px 24px', textAlign: 'center',
                        borderBottom: `1px solid ${color}33` }}>
            <p style={{ margin: '0 0 16px', color: '#aaa', fontSize: '12px',
                        fontFamily: 'Arial, sans-serif' }}>
              Presenta este QR en la puerta del evento
            </p>
            {/* White frame around QR */}
            <div style={{ display: 'inline-block', background: '#fff',
                          padding: '12px', border: `3px solid ${color}`,
                          borderRadius: '8px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="Código QR de acceso"
                width={220}
                height={220}
                style={{ display: 'block' }}
              />
            </div>
            <p style={{ margin: '14px 0 0', color: '#555', fontSize: '10px',
                        fontFamily: 'Arial, sans-serif', letterSpacing: '1px' }}>
              QR ÚNICO E INTRANSFERIBLE
            </p>
          </div>

          {/* Ticket details */}
          <div style={{ padding: '20px 24px' }}>
            {[
              { label: 'Titular',  value: payload.name },
              { label: 'Tipo',     value: isBox ? 'Box completo' : 'Entrada individual' },
              { label: isBox || payload.zone !== 'general' ? 'Pulseras' : 'Entradas',
                       value: qtyLabel },
              { label: 'Fecha',    value: 'Domingo 29 Marzo 2026 · 4:00 PM' },
              { label: 'Comprado', value: date },
              { label: 'Orden',    value: payload.orderId.slice(-12).toUpperCase() },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'flex-start', paddingBottom: '10px',
                                        marginBottom: '10px',
                                        borderBottom: '1px solid #1f1f1f' }}>
                <span style={{ color: color, fontSize: '10px', fontWeight: 700,
                                letterSpacing: '1px', textTransform: 'uppercase',
                                fontFamily: 'Arial, sans-serif', flexShrink: 0,
                                marginRight: '12px', paddingTop: '1px' }}>
                  {label}
                </span>
                <span style={{ color: '#fff', fontSize: '13px',
                                fontFamily: 'Arial, sans-serif', textAlign: 'right' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Warning */}
          <div style={{ background: '#1a1a1a', padding: '14px 20px',
                        borderTop: `1px solid ${color}33` }}>
            <p style={{ margin: '0', color: '#666', fontSize: '11px',
                        lineHeight: '1.6', fontFamily: 'Arial, sans-serif',
                        textAlign: 'center' }}>
              🔒 No compartas este QR ni lo publiques en redes sociales.<br/>
              Cada código solo puede usarse <strong style={{ color: '#aaa' }}>una vez</strong>.
            </p>
          </div>
        </div>

        {/* Download button */}
        <a
          href={qrUrl}
          download="ticket-festival-cubanada.png"
          style={{
            display: 'block', width: '100%', marginTop: '16px',
            background: '#FACC15', color: '#000',
            textAlign: 'center', padding: '14px',
            borderRadius: '10px', fontWeight: 900,
            fontSize: '14px', letterSpacing: '1px',
            textDecoration: 'none', textTransform: 'uppercase',
            fontFamily: '"Arial Black", Arial, sans-serif',
          }}
        >
          Descargar QR ↓
        </a>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#333', fontSize: '10px',
                    fontFamily: 'Arial, sans-serif', marginTop: '20px' }}>
          Perion Entertainment · festientrada@gmail.com
        </p>

      </div>
    </main>
  );
}
