// lib/email.ts
// Gmail-safe dark/yellow festival ticket email.
//
// Design principle:
//   - Outer bg: #000 with every bgcolor attribute set (table + tr + td)
//   - Header & CTA bars: solid #FACC15 yellow with black text
//     → These look YELLOW on ANY background, even if Gmail overrides outer dark
//   - Body cards: #111111 with yellow (#FACC15) borders & labels
//   - Body text: #FFFFFF on dark cards
//   - No CSS classes, no <style> blocks — 100% inline + bgcolor attributes

const GMAIL_USER     = process.env.GMAIL_USER;
const GMAIL_PASS     = process.env.GMAIL_APP_PASSWORD;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS   = process.env.EMAIL_FROM ?? 'confirmacion@festientrada.com';
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL ?? 'https://festientrada.com';

// ── Palette ───────────────────────────────────────────────────
const Y = '#FACC15';  // yellow-400 — unmistakably yellow on any background
const B = '#000000';  // pure black
const D = '#111111';  // dark card bg
const W = '#FFFFFF';  // white text
const G = '#AAAAAA';  // gray secondary text

// ── Zone info ─────────────────────────────────────────────────
const ZONE_LABEL: Record<string, string> = {
  platinum: 'PLATINUM',
  vip:      'VIP',
  malecon:  'BOX MALECÓN',
  general:  'GENERAL',
};

export interface ConfirmationEmailParams {
  buyerInfo:       { name: string; email: string; phone: string; dni: string };
  purchaseDetails: { type: 'box' | 'individual'; zone: string; qty: number };
  orderId:         string;
  ticketToken:     string;
  amount:          number;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Template ──────────────────────────────────────────────────
export function buildEmailHtml(p: ConfirmationEmailParams): string {
  const isBox     = p.purchaseDetails.type === 'box';
  const isGeneral = p.purchaseDetails.zone === 'general';
  const pulseras  = isBox ? 10 : p.purchaseDetails.qty;
  const pulsLabel = isGeneral
    ? (pulseras === 1 ? '1 entrada'  : `${pulseras} entradas`)
    : (pulseras === 1 ? '1 pulsera'  : `${pulseras} pulseras`);
  const entradaUrl = `${APP_URL}/entrada/${encodeURIComponent(p.ticketToken)}`;

  return `<!DOCTYPE html>
<html lang="es" bgcolor="${B}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>Tu entrada · Festival Cubanada 2026</title>
</head>
<body bgcolor="${B}" style="margin:0;padding:0;background-color:${B};">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
       bgcolor="${B}" style="background-color:${B};border-collapse:collapse;">
  <tr bgcolor="${B}" style="background-color:${B};">
    <td align="center" bgcolor="${B}"
        style="background-color:${B};padding:20px 10px;">

      <!-- === CARD max 580px === -->
      <table width="580" cellpadding="0" cellspacing="0" border="0"
             bgcolor="${B}"
             style="max-width:580px;width:100%;background-color:${B};
                    border-collapse:collapse;border:2px solid ${Y};">

        <!-- ▌▌ YELLOW HEADER ▌▌ -->
        <tr bgcolor="${Y}" style="background-color:${Y};">
          <td align="center" bgcolor="${Y}"
              style="background-color:${Y};padding:22px 20px 16px;">
            <p style="margin:0 0 2px;color:${B};font-size:9px;font-weight:700;
                      letter-spacing:6px;text-transform:uppercase;
                      font-family:Arial,sans-serif;">
              PERION ENTERTAINMENT
            </p>
            <p style="margin:0;color:${B};font-size:38px;font-weight:900;
                      letter-spacing:6px;line-height:1;
                      font-family:'Arial Black',Arial,sans-serif;
                      text-transform:uppercase;">
              FESTIVAL CUBANADA
            </p>
            <p style="margin:4px 0 0;color:${B};font-size:11px;font-weight:700;
                      letter-spacing:4px;text-transform:uppercase;
                      font-family:Arial,sans-serif;">
              CHANCAY · LIMA · PERÚ · 29 MAR 2026
            </p>
          </td>
        </tr>

        <!-- ▌▌ DIVIDER ▌▌ -->
        <tr bgcolor="${B}" style="background-color:${B};">
          <td bgcolor="${B}" style="background-color:${B};height:3px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- ▌▌ CONFIRMATION BAR ▌▌ -->
        <tr bgcolor="${Y}" style="background-color:${Y};">
          <td align="center" bgcolor="${Y}"
              style="background-color:${Y};padding:12px 20px;">
            <p style="margin:0;color:${B};font-size:16px;font-weight:900;
                      letter-spacing:2px;text-transform:uppercase;
                      font-family:'Arial Black',Arial,sans-serif;">
              ✓ &nbsp; ¡ENTRADA CONFIRMADA!
            </p>
          </td>
        </tr>

        <!-- ▌▌ BODY ▌▌ -->
        <tr bgcolor="${B}" style="background-color:${B};">
          <td bgcolor="${B}" style="background-color:${B};padding:24px 20px;">

            <!-- Greeting -->
            <p style="margin:0 0 20px;color:${G};font-size:14px;
                      line-height:1.7;font-family:Arial,sans-serif;">
              Hola <strong style="color:${W};">${esc(p.buyerInfo.name)}</strong>,
              tu compra fue procesada exitosamente. Presenta el QR
              en la entrada del evento para
              ${isGeneral
                ? `ingresar con tus <strong style="color:${Y};">${pulsLabel}</strong>`
                : `recoger ${pulseras > 1 ? 'tus' : 'tu'} <strong style="color:${Y};">${pulsLabel}</strong>`}.
            </p>

            <!-- Security notice -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="margin-bottom:20px;border-collapse:collapse;border:2px solid ${Y};">
              <tr bgcolor="${Y}" style="background-color:${Y};">
                <td bgcolor="${Y}" style="background-color:${Y};padding:7px 14px;">
                  <span style="color:${B};font-size:10px;font-weight:900;
                               letter-spacing:3px;text-transform:uppercase;
                               font-family:Arial,sans-serif;">
                    🔒 QR ÚNICO E INTRANSFERIBLE
                  </span>
                </td>
              </tr>
              <tr bgcolor="${D}" style="background-color:${D};">
                <td bgcolor="${D}" style="background-color:${D};padding:12px 16px;">
                  <p style="margin:0;color:${G};font-size:12px;font-family:Arial,sans-serif;line-height:1.6;">
                    Este código QR es <strong style="color:${W};">personal e intransferible</strong>.
                    No lo compartas ni lo publiques en redes sociales.
                    Cada QR solo puede usarse <strong style="color:${Y};">una vez por ${isGeneral ? 'entrada' : 'acceso'}</strong> —
                    si alguien más lo escanea primero, perderás tu lugar.
                  </p>
                </td>
              </tr>
            </table>

            <!-- ── CTA BUTTON ─────────────────────────── -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="margin-bottom:20px;">
              <tr>
                <td align="center">
                  <a href="${entradaUrl}"
                     style="display:inline-block;background-color:${Y};
                            color:${B};font-size:15px;font-weight:900;
                            letter-spacing:1px;text-decoration:none;
                            padding:16px 40px;border-radius:6px;
                            font-family:'Arial Black',Arial,sans-serif;
                            text-transform:uppercase;">
                    Ver mi ticket →
                  </a>
                </td>
              </tr>
            </table>

            <!-- ── Instructions ──────────────────────── -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border-collapse:collapse;border:2px solid ${Y};">
              <tr bgcolor="${Y}" style="background-color:${Y};">
                <td bgcolor="${Y}" style="background-color:${Y};padding:7px 14px;">
                  <span style="color:${B};font-size:10px;font-weight:900;
                               letter-spacing:3px;text-transform:uppercase;
                               font-family:Arial,sans-serif;">
                    INSTRUCCIONES
                  </span>
                </td>
              </tr>
              <tr bgcolor="${D}" style="background-color:${D};">
                <td bgcolor="${D}" style="background-color:${D};padding:14px;">

                  ${[
                    `Abre tu ticket con el botón de arriba y guárdalo o toma captura de pantalla.`,
                    `Dirígete al <strong style="color:${W};">Malecón del Puerto de Chancay</strong> el día del evento.`,
                    isBox
                      ? `El staff escaneará tu QR y entregará las <strong style="color:${Y};">10 pulseras</strong> de tu box.`
                      : `El staff escaneará tu QR y entregará tu${pulseras > 1 ? 's' : ''} <strong style="color:${Y};">${pulsLabel}</strong>.`,
                  ].map((txt, i) => `
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"
                         style="margin-bottom:${i < 2 ? '10px' : '0'};">
                    <tr>
                      <td width="28" valign="top">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr bgcolor="${Y}" style="background-color:${Y};">
                            <td bgcolor="${Y}"
                                style="background-color:${Y};width:22px;height:22px;
                                       border-radius:50%;text-align:center;
                                       line-height:22px;font-size:12px;
                                       font-weight:900;color:${B};
                                       font-family:Arial,sans-serif;">
                              ${i + 1}
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td style="color:${G};font-size:13px;line-height:1.6;
                                 padding-left:8px;font-family:Arial,sans-serif;">
                        ${txt}
                      </td>
                    </tr>
                  </table>`).join('')}

                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- ▌▌ YELLOW BOTTOM STRIPE ▌▌ -->
        <tr bgcolor="${B}" style="background-color:${B};">
          <td bgcolor="${B}" style="background-color:${B};height:3px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr bgcolor="${Y}" style="background-color:${Y};">
          <td bgcolor="${Y}" style="background-color:${Y};height:6px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- ▌▌ FOOTER ▌▌ -->
        <tr bgcolor="${B}" style="background-color:${B};">
          <td align="center" bgcolor="${B}"
              style="background-color:${B};padding:14px 20px;">
            <p style="margin:0 0 3px;color:#555555;font-size:11px;font-family:Arial,sans-serif;">
              Perion Entertainment · Festival Cubanada · Chancay 2026
            </p>
            <p style="margin:0;color:#444444;font-size:10px;font-family:Arial,sans-serif;">
              Enviado a ${esc(p.buyerInfo.email)} · Entrada no reembolsable
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`;
}

// ── Send ─────────────────────────────────────────────────────
export async function sendConfirmationEmail(params: ConfirmationEmailParams): Promise<void> {
  const zone    = ZONE_LABEL[params.purchaseDetails.zone] ?? params.purchaseDetails.zone.toUpperCase();
  const subject = `Tu entrada · Festival Cubanada ${zone} · Chancay 2026`;
  const html    = buildEmailHtml(params);

  if (GMAIL_USER && GMAIL_PASS) {
    const nodemailer = await import('nodemailer').then(m => m.default);
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
    const info = await transporter.sendMail({
      from: `"Festival Cubanada" <${GMAIL_USER}>`,
      to:   params.buyerInfo.email,
      subject,
      html,
    });
    console.log('Email enviado:', info.messageId, '→', params.buyerInfo.email);
    return;
  }

  if (RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Festival Cubanada <${FROM_ADDRESS}>`,
        to:   [params.buyerInfo.email],
        subject,
        html,
      }),
    });
    if (!res.ok) console.error('Resend error:', res.status, await res.text());
    return;
  }

  console.warn('No hay proveedor de email configurado (GMAIL_USER o RESEND_API_KEY)');
}
