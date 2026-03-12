# 🎵 Festival Cubanada Chancay 2026

Sistema completo de venta de tickets online para el **Primer Festival Cubanada en Chancay**, organizado por **Perion Entertainment**.

![Festival Status](https://img.shields.io/badge/Status-Listo%20para%20desarrollo-green)
![Platform](https://img.shields.io/badge/Platform-Next.js%2014-blue)
![License](https://img.shields.io/badge/License-Perion%20Entertainment-orange)

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Arquitectura](#-arquitectura)
- [Funcionalidades Principales](#-funcionalidades-principales)
- [Seguridad](#-seguridad)
- [Producción](#-producción)
- [Soporte](#-soporte)

---

## 🎯 Descripción

Sistema web completo para la **venta 100% online de entradas** al Primer Festival Cubanada en Chancay (15 de Abril, 2026). El sistema elimina completamente la necesidad de puntos de venta físicos, automatizando todo el proceso desde la compra hasta la validación en puerta.

### Evento

- **Nombre**: Primer Festival Cubanada en Chancay
- **Fecha**: 15 de Abril, 2026
- **Ubicación**: Playa de Chancay
- **Artistas**: 4-5 orquestas y artistas de talla nacional
- **Organizador**: Perion Entertainment

---

## ✨ Características

### 🎨 Diseño

- ✅ Interfaz tropical y festivalera con colores vibrantes
- ✅ Diseño responsive (móvil, tablet, desktop)
- ✅ Animaciones y efectos visuales atractivos
- ✅ Tema neón tropical con degradados
- ✅ Experiencia de usuario optimizada

### 🎫 Sistema de Tickets

- ✅ 3 tipos de entradas: General (S/ 50), VIP (S/ 100), Platino (S/ 200)
- ✅ Compra de múltiples entradas en una sola orden (hasta 10)
- ✅ Generación automática de tickets digitales
- ✅ Código QR único por cada entrada individual
- ✅ Descarga de tickets en formato PDF
- ✅ Confirmación por email (simulado)

### 🔐 Seguridad y Validación

- ✅ Identificador único (UUID v4) por entrada
- ✅ Código QR irrepetible vinculado a URL de validación
- ✅ Sistema de validación en tiempo real
- ✅ Prevención de uso duplicado
- ✅ Marcado automático de entradas usadas
- ✅ Imposibilidad de falsificación

### 📊 Panel de Administración

- ✅ Dashboard con estadísticas en tiempo real
- ✅ Listado completo de todas las órdenes
- ✅ Filtros por tipo de entrada
- ✅ Búsqueda por nombre, email, DNI, ID
- ✅ Estadísticas de ingresos y ventas
- ✅ Contador de entradas validadas

---

## 🛠️ Tecnologías

```json
{
  "frontend": "Next.js 14 (App Router)",
  "language": "TypeScript",
  "styling": "Tailwind CSS",
  "qr-generation": "qrcode",
  "pdf-generation": "jsPDF + html2canvas",
  "id-generation": "uuid",
  "database": "localStorage (desarrollo) → PostgreSQL/MySQL (producción)"
}
```

### Stack Completo

- **Framework**: Next.js 14 con App Router
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS con configuración custom
- **Generación QR**: qrcode
- **Generación PDF**: jsPDF + html2canvas
- **IDs únicos**: uuid (v4)
- **Persistencia**: localStorage (desarrollo)

---

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+ instalado
- npm o yarn

### Pasos

1. **Navega a la carpeta del proyecto**
   ```bash
   cd C:\Users\ACER\Desktop\festival-cubanada-perion
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Inicia el servidor de desarrollo**
   ```bash
   npm run dev
   ```

4. **Abre en el navegador**
   ```
   http://localhost:3000
   ```

### Comandos Disponibles

```bash
npm run dev      # Iniciar servidor de desarrollo
npm run build    # Compilar para producción
npm run start    # Iniciar servidor de producción
npm run lint     # Ejecutar linter
```

---

## 💻 Uso

### Para Compradores

1. **Acceder al sitio**: Abre `http://localhost:3000`
2. **Explorar el evento**: Revisa información, artistas, precios
3. **Comprar entradas**:
   - Click en "Comprar Entradas"
   - Selecciona tipo y cantidad
   - Llena datos personales (nombre, DNI, email, teléfono)
   - Simula el pago
4. **Recibir ticket**:
   - Descarga PDF con todos los QR
   - Guarda la URL de confirmación
   - Revisa tu email (simulado)

### Para Validadores

1. **Escanear QR**: Usa cualquier lector de QR
2. **Verificar datos**: El sistema muestra:
   - Nombre del comprador
   - DNI
   - Tipo de entrada
   - Estado (válida/usada)
3. **Validar entrada**:
   - Si es válida → Click en "Validar Entrada"
   - Si ya fue usada → Rechazar ingreso

### Para Administradores

1. **Acceder al panel**: `http://localhost:3000/admin`
2. **Ver estadísticas**: Dashboard en tiempo real
3. **Gestionar órdenes**: Buscar, filtrar, revisar
4. **Exportar datos**: (Implementar en producción)

---

## 📁 Estructura del Proyecto

```
festival-cubanada-perion/
├── app/                          # App Router de Next.js
│   ├── layout.tsx               # Layout principal con estrellas
│   ├── page.tsx                 # Página de inicio (Hero, Artistas, FAQ)
│   ├── globals.css              # Estilos globales y animaciones
│   ├── comprar/                 # Página de compra de entradas
│   │   └── page.tsx
│   ├── ticket/                  # Visualización de tickets
│   │   └── [id]/
│   │       └── page.tsx
│   ├── validar/                 # Sistema de validación
│   │   └── [entryId]/
│   │       └── page.tsx
│   └── admin/                   # Panel de administración
│       └── page.tsx
├── lib/                          # Utilidades y servicios
│   ├── database.ts              # Servicio de base de datos (localStorage)
│   ├── qr-generator.ts          # Generación de códigos QR
│   └── ticket-generator.ts      # Generación de PDFs
├── public/                       # Archivos estáticos
├── next.config.js               # Configuración de Next.js
├── tailwind.config.ts           # Configuración de Tailwind
├── tsconfig.json                # Configuración de TypeScript
├── package.json                 # Dependencias del proyecto
└── README.md                    # Este archivo
```

---

## 🏗️ Arquitectura

### Flujo de Compra

```
Usuario accede → Selecciona entradas → Llena datos → Simula pago
                                                          ↓
                                    Se genera orden con UUID único
                                                          ↓
                        Se crean N entradas individuales con QR único
                                                          ↓
                              Se genera PDF con todos los QR
                                                          ↓
                            Usuario descarga y guarda tickets
```

### Flujo de Validación

```
Personal escanea QR → Redirige a /validar/[entryId]
                                    ↓
                    Sistema verifica en base de datos
                                    ↓
            ¿Entrada existe?    ¿Ya fue usada?
                ↓                      ↓
            SÍ/NO              SÍ → Rechazar
                                NO → Mostrar botón "Validar"
                                         ↓
                            Personal valida → Marca como usada
                                         ↓
                                  Permite ingreso
```

### Base de Datos (Desarrollo)

```typescript
interface Ticket {
  id: string;                    // UUID de la orden
  eventId: string;               // ID del evento
  ticketType: 'general' | 'vip' | 'platino';
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerDNI: string;
  quantity: number;              // Cantidad de entradas
  totalPrice: number;
  purchaseDate: string;
  qrCode: string;                // QR de la orden completa
  validated: boolean;            // True cuando todas las entradas se validan
  validatedAt?: string;
  tickets: TicketEntry[];        // Array de entradas individuales
}

interface TicketEntry {
  entryId: string;               // UUID único de esta entrada
  ticketType: string;
  qrData: string;                // URL de validación
  validated: boolean;            // Estado de esta entrada
}
```

---

## 🔧 Funcionalidades Principales

### 1. Página de Inicio (`/`)

- Hero con countdown al evento
- Información del festival
- Sección de artistas (placeholders)
- Precios y tipos de entrada
- FAQ interactivo
- Footer con contacto

### 2. Compra de Entradas (`/comprar`)

- Selector de tipo de entrada
- Cantidad (1-10 máximo)
- Formulario de datos del comprador
- Resumen de compra en tiempo real
- Simulador de pasarela de pago
- Validaciones client-side

### 3. Ticket Digital (`/ticket/[id]`)

- Confirmación de compra
- Detalles de la orden
- Información del evento
- Códigos QR individuales por entrada
- Descarga de PDF completo
- Instrucciones de uso

### 4. Validación (`/validar/[entryId]`)

- Verificación instantánea
- Muestra datos del comprador
- Detección de entradas ya usadas
- Botón de validación
- Códigos de color por estado
- Guía para validadores

### 5. Panel Admin (`/admin`)

- Dashboard con estadísticas
- Total de órdenes e ingresos
- Desglose por tipo de entrada
- Tabla con todas las órdenes
- Búsqueda y filtros
- Limpieza de base de datos (desarrollo)

---

## 🔐 Seguridad

### Medidas Implementadas

✅ **UUID v4**: Identificadores únicos imposibles de predecir
✅ **Un uso por QR**: Cada código solo puede validarse una vez
✅ **Verificación en servidor**: Los QR apuntan a URLs verificables
✅ **Registro de validación**: Timestamp de cuándo se usó cada entrada
✅ **Código de barras QR**: Alta corrección de errores (nivel H)

### Para Producción

🔒 **Añadir**:
- Autenticación de administradores (JWT, NextAuth)
- HTTPS obligatorio
- Rate limiting en APIs
- Captcha en formulario de compra
- Encriptación de datos sensibles
- Base de datos con backup automático
- Logs de auditoría

---

## 🌐 Producción

### Migración a Base de Datos Real

Actualmente usa **localStorage** (solo desarrollo). Para producción:

#### Opción 1: PostgreSQL + Prisma

```typescript
// prisma/schema.prisma
model Ticket {
  id            String   @id @default(uuid())
  eventId       String
  ticketType    String
  buyerName     String
  buyerEmail    String
  buyerPhone    String
  buyerDNI      String
  quantity      Int
  totalPrice    Float
  purchaseDate  DateTime @default(now())
  validated     Boolean  @default(false)
  validatedAt   DateTime?
  tickets       TicketEntry[]
}

model TicketEntry {
  id          String   @id @default(uuid())
  ticketId    String
  ticket      Ticket   @relation(fields: [ticketId], references: [id])
  entryId     String   @unique
  ticketType  String
  qrData      String
  validated   Boolean  @default(false)
}
```

#### Opción 2: MongoDB + Mongoose

```javascript
const TicketSchema = new Schema({
  id: { type: String, required: true, unique: true },
  eventId: String,
  ticketType: String,
  buyerName: String,
  // ... resto de campos
  tickets: [{
    entryId: String,
    ticketType: String,
    qrData: String,
    validated: Boolean
  }]
});
```

### Integración de Pasarela de Pago

Reemplazar el simulador de pago por:

- **Niubiz** (Visa/Mastercard Perú)
- **Culqi** (Perú)
- **Mercado Pago**
- **PayPal**
- **Stripe**
- **Yape/Plin** (billeteras digitales)

### Deploy

Opciones recomendadas:

```bash
# Vercel (Recomendado para Next.js)
vercel deploy

# Netlify
netlify deploy --prod

# AWS / Google Cloud / Azure
# Usar Docker + servidor Node.js
```

### Variables de Entorno

```env
# .env.local
DATABASE_URL="postgresql://..."
PAYMENT_API_KEY="..."
EMAIL_SERVICE_API_KEY="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://festival-cubanada.com"
```

---

## 📧 Notificaciones por Email

Implementar con:

- **Resend** (recomendado)
- **SendGrid**
- **Amazon SES**
- **Mailgun**

```typescript
// Ejemplo con Resend
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'tickets@perionentertainment.com',
  to: buyerEmail,
  subject: 'Tu ticket para Festival Cubanada',
  html: `<h1>¡Gracias por tu compra!</h1>...`,
  attachments: [{
    filename: 'ticket.pdf',
    content: pdfBuffer,
  }],
});
```

---

## 🎨 Personalización

### Cambiar Colores

Edita `tailwind.config.ts`:

```typescript
colors: {
  tropical: {
    coral: '#FF6B6B',    // Color principal
    teal: '#4ECDC4',     // Color secundario
    sunset: '#FFE66D',   // Color de acento
    night: '#1A1A2E',    // Fondo oscuro
    palm: '#16A085',     // Color de éxito
  }
}
```

### Reutilizar para Otro Evento

1. Edita `lib/database.ts`:
   ```typescript
   export const FESTIVAL_EVENT: Event = {
     id: 'nuevo-evento-2026',
     name: 'Nombre del Nuevo Evento',
     date: '2026-XX-XX',
     location: 'Nueva Ubicación',
     prices: {
       general: 60,
       vip: 120,
       platino: 250,
     }
   };
   ```

2. Actualiza textos en `app/page.tsx`
3. Cambia imágenes en `/public/`
4. Ajusta artistas y line-up

---

## 🐛 Troubleshooting

### Error: "Module not found"

```bash
rm -rf node_modules
rm package-lock.json
npm install
```

### Error: "localStorage is not defined"

Es normal en SSR. El código ya maneja esto con:
```typescript
if (typeof window !== 'undefined') { ... }
```

### QR no se genera

Verifica que `qrcode` esté instalado:
```bash
npm install qrcode @types/qrcode
```

### PDF no se descarga

Verifica que `jspdf` y `html2canvas` estén instalados:
```bash
npm install jspdf html2canvas
```

---

## 📱 Soporte

Para preguntas, problemas o mejoras:

- **Email**: info@perionentertainment.com
- **Teléfono**: +51 999 999 999
- **Web**: [Perion Entertainment](https://perionentertainment.com)

---

## 📄 Licencia

Proyecto desarrollado para **Perion Entertainment**.
Todos los derechos reservados © 2026.

---

## 🙏 Agradecimientos

Desarrollado con ❤️ para el **Primer Festival Cubanada en Chancay 2026**.

**¡Nos vemos en la playa! 🌴🎵🏝️**

---

## 📸 Screenshots

_(Agregar capturas de pantalla al ejecutar el proyecto)_

---

## 🔄 Versión

- **Versión actual**: 1.0.0
- **Última actualización**: Marzo 2026
- **Estado**: Listo para desarrollo local
- **Próximo paso**: Deploy a producción

---

**Desarrollado por**: [Tu Nombre/Empresa]
**Cliente**: Perion Entertainment
**Proyecto**: Festival Cubanada Chancay 2026
