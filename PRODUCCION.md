# 🚀 Guía de Producción - Festival Cubanada

## 📋 Checklist Completo Pre-Lanzamiento

### 1. Base de Datos

#### Opción A: PostgreSQL (Recomendada)

**Instalación con Prisma:**

```bash
npm install prisma @prisma/client
npx prisma init
```

**Schema (prisma/schema.prisma):**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Ticket {
  id            String        @id @default(uuid())
  eventId       String
  ticketType    String
  buyerName     String
  buyerEmail    String
  buyerPhone    String
  buyerDNI      String
  quantity      Int
  totalPrice    Float
  purchaseDate  DateTime      @default(now())
  qrCode        String
  validated     Boolean       @default(false)
  validatedAt   DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  tickets       TicketEntry[]

  @@index([buyerEmail])
  @@index([buyerDNI])
  @@index([eventId])
}

model TicketEntry {
  id         String   @id @default(uuid())
  entryId    String   @unique
  ticketId   String
  ticket     Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  ticketType String
  qrData     String
  validated  Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([entryId])
  @@index([ticketId])
}
```

**Migración:**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**Actualizar lib/database.ts:**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function saveTicket(ticket: Ticket) {
  return await prisma.ticket.create({
    data: {
      ...ticket,
      tickets: {
        create: ticket.tickets
      }
    }
  });
}

export async function getTicketById(id: string) {
  return await prisma.ticket.findUnique({
    where: { id },
    include: { tickets: true }
  });
}

// ... más funciones
```

#### Opción B: MongoDB

```bash
npm install mongodb mongoose
```

```javascript
const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  eventId: String,
  ticketType: String,
  buyerName: String,
  buyerEmail: { type: String, index: true },
  buyerPhone: String,
  buyerDNI: { type: String, index: true },
  quantity: Number,
  totalPrice: Number,
  purchaseDate: { type: Date, default: Date.now },
  qrCode: String,
  validated: Boolean,
  validatedAt: Date,
  tickets: [{
    entryId: { type: String, unique: true, index: true },
    ticketType: String,
    qrData: String,
    validated: Boolean
  }]
});

module.exports = mongoose.model('Ticket', TicketSchema);
```

---

### 2. Pasarela de Pago

#### Niubiz (Visa/Mastercard Perú)

**Instalación:**

```bash
npm install axios
```

**Implementación (app/api/payment/route.ts):**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  const { amount, email } = await req.json();

  const response = await axios.post('https://apisandbox.vnforappstest.com/api.security/v1/security', {
    amount,
    email,
    // ... configuración de Niubiz
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.NIUBIZ_API_KEY}`
    }
  });

  return NextResponse.json(response.data);
}
```

#### Culqi (Perú)

```bash
npm install culqi-node
```

```typescript
import Culqi from 'culqi-node';

const culqi = new Culqi({
  privateKey: process.env.CULQI_PRIVATE_KEY,
  publicKey: process.env.CULQI_PUBLIC_KEY,
});

const charge = await culqi.charges.create({
  amount: totalPrice * 100, // En centavos
  currency_code: 'PEN',
  email: buyerEmail,
  source_id: tokenId,
});
```

#### Mercado Pago

```bash
npm install mercadopago
```

```typescript
import mercadopago from 'mercadopago';

mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

const preference = await mercadopago.preferences.create({
  items: [{
    title: 'Entrada Festival Cubanada',
    unit_price: totalPrice,
    quantity: 1,
  }],
  back_urls: {
    success: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    failure: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failure`,
  },
});
```

---

### 3. Envío de Emails

#### Resend (Recomendado)

**Instalación:**

```bash
npm install resend
```

**Implementación (lib/email.ts):**

```typescript
import { Resend } from 'resend';
import { generateTicketPDF } from './ticket-generator';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTicketEmail(ticket: Ticket, pdfBuffer: Buffer) {
  await resend.emails.send({
    from: 'Festival Cubanada <tickets@perionentertainment.com>',
    to: ticket.buyerEmail,
    subject: '🎉 Tu entrada para Festival Cubanada 2026',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF6B6B;">¡Gracias por tu compra!</h1>
        <p>Hola ${ticket.buyerName},</p>
        <p>Tu entrada para el <strong>Primer Festival Cubanada en Chancay</strong> ha sido confirmada.</p>

        <div style="background: #f0f0f0; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h2>Detalles de tu compra:</h2>
          <ul>
            <li><strong>Orden:</strong> #${ticket.id.substring(0, 8)}</li>
            <li><strong>Tipo:</strong> ${ticket.ticketType.toUpperCase()}</li>
            <li><strong>Cantidad:</strong> ${ticket.quantity} entrada(s)</li>
            <li><strong>Total:</strong> S/ ${ticket.totalPrice.toFixed(2)}</li>
          </ul>
        </div>

        <p><strong>📅 Fecha:</strong> 15 de Abril, 2026 - 20:00 hrs</p>
        <p><strong>📍 Lugar:</strong> Playa de Chancay</p>

        <p>Tu ticket está adjunto en formato PDF. Presenta los códigos QR en la entrada del evento.</p>

        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Este es un correo automático. Para consultas, contacta a info@perionentertainment.com
        </p>
      </div>
    `,
    attachments: [{
      filename: `ticket-${ticket.id.substring(0, 8)}.pdf`,
      content: pdfBuffer,
    }],
  });
}
```

**Uso:**

```typescript
// Después de generar el ticket
const pdfBuffer = await generateTicketPDFBuffer(ticket);
await sendTicketEmail(ticket, pdfBuffer);
```

---

### 4. Autenticación de Admin

#### NextAuth.js

**Instalación:**

```bash
npm install next-auth
```

**Configuración (app/api/auth/[...nextauth]/route.ts):**

```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Validar contra tu base de datos
        if (
          credentials?.username === process.env.ADMIN_USERNAME &&
          credentials?.password === process.env.ADMIN_PASSWORD
        ) {
          return { id: '1', name: 'Admin', email: 'admin@perionentertainment.com' };
        }
        return null;
      }
    })
  ],
  pages: {
    signIn: '/admin/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
```

**Proteger rutas (app/admin/page.tsx):**

```typescript
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/admin/login');
  }

  // ... resto del componente
}
```

---

### 5. Deploy

#### Vercel (Recomendado)

```bash
npm install -g vercel
vercel login
vercel deploy --prod
```

**Configurar variables de entorno en Vercel Dashboard:**

```
DATABASE_URL=...
RESEND_API_KEY=...
PAYMENT_API_KEY=...
NEXTAUTH_SECRET=...
```

#### Netlify

```bash
npm run build
netlify deploy --prod --dir=.next
```

#### Docker

**Dockerfile:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**Construir y ejecutar:**

```bash
docker build -t festival-cubanada .
docker run -p 3000:3000 -e DATABASE_URL="..." festival-cubanada
```

---

### 6. Dominio y SSL

#### Opción 1: Vercel (Automático)

Vercel proporciona SSL automático con Let's Encrypt.

```bash
vercel domains add festival-cubanada.com
```

#### Opción 2: Cloudflare

1. Apunta tu dominio a Cloudflare
2. Activa "Proxy" (nube naranja)
3. SSL/TLS → Full (strict)

---

### 7. Monitoreo y Analytics

#### Google Analytics

```typescript
// app/layout.tsx
import Script from 'next/script';

<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
  `}
</Script>
```

#### Sentry (Errores)

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

---

### 8. Backups

#### Cron Job para PostgreSQL

```bash
# Crear backup diario
0 2 * * * pg_dump festival_cubanada > /backups/festival_$(date +\%Y\%m\%d).sql
```

#### AWS S3 para archivos

```bash
npm install @aws-sdk/client-s3
```

---

### 9. Rate Limiting

**Proteger endpoints (middleware.ts):**

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimit = new Map();

export function middleware(request: NextRequest) {
  const ip = request.ip ?? 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minuto
  const max = 10; // 10 requests por minuto

  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
  } else {
    const record = rateLimit.get(ip);
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count++;
      if (record.count > max) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

---

### 10. Testing

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

**Ejemplo de test (\_\_tests\_\_/purchase.test.tsx):**

```typescript
import { render, screen } from '@testing-library/react';
import ComprarPage from '@/app/comprar/page';

describe('Purchase Flow', () => {
  it('should render purchase form', () => {
    render(<ComprarPage />);
    expect(screen.getByText('Comprar Entradas')).toBeInTheDocument();
  });

  it('should calculate total correctly', () => {
    // ... test lógico
  });
});
```

---

## 🔒 Seguridad en Producción

### Lista de verificación:

- [x] HTTPS activado
- [x] Variables de entorno protegidas
- [x] Rate limiting implementado
- [x] Validación de inputs
- [x] Sanitización de datos
- [x] Headers de seguridad
- [x] CORS configurado
- [x] SQL injection protegido (Prisma ORM)
- [x] XSS protegido (React automático)
- [x] CSRF tokens
- [x] Autenticación de admin

---

## 📊 Métricas a Monitorear

1. **Ventas**:
   - Total de órdenes por día
   - Ingresos acumulados
   - Tickets por tipo

2. **Técnicas**:
   - Uptime del servidor
   - Tiempo de respuesta
   - Errores 5xx/4xx
   - Tráfico por hora

3. **Conversión**:
   - Visitantes → Compradores
   - Abandono del carrito
   - Tiempo promedio de compra

---

## 🚨 Plan de Contingencia

### Si el sitio cae:

1. **Backup en S3/Cloudflare**
2. **Página estática con información de contacto**
3. **Comunicar en redes sociales**
4. **Activar venta telefónica temporal**

### Si hay sobrecarga:

1. **Activar CDN (Cloudflare)**
2. **Escalar servidores (Vercel automático)**
3. **Queue de compras**

---

## 💰 Costos Estimados (Mensual)

| Servicio | Costo Aprox. |
|----------|--------------|
| Vercel (Pro) | $20 USD |
| Base de datos PostgreSQL (Railway/Supabase) | $5-25 USD |
| Resend (Email) | $0-20 USD |
| Dominio | $12 USD/año |
| Pasarela de pago | 2-4% por transacción |

**Total estimado**: $50-80 USD/mes

---

**¡Éxito con el lanzamiento! 🚀**
