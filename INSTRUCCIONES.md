# 🚀 Instrucciones Rápidas - Festival Cubanada

## ⚡ Inicio Rápido (5 pasos)

### 1. Abrir Terminal
```bash
cd C:\Users\ACER\Desktop\festival-cubanada-perion
```

### 2. Instalar Dependencias
```bash
npm install
```
⏱️ Tomará 2-3 minutos la primera vez

### 3. Iniciar Servidor
```bash
npm run dev
```

### 4. Abrir Navegador
```
http://localhost:3000
```

### 5. ¡Listo! Prueba el sistema

---

## 🧪 Cómo Probar el Sistema

### Test 1: Comprar una Entrada

1. Click en **"Comprar Entradas"**
2. Selecciona tipo: **VIP**
3. Cantidad: **2**
4. Llena datos:
   - Nombre: `Juan Pérez`
   - DNI: `12345678`
   - Email: `juan@example.com`
   - Teléfono: `999999999`
5. Click en **"Pagar S/ 200.00"**
6. Click en **"Pagar Ahora"** (simulación)
7. ✅ Recibirás tu ticket con 2 QR individuales

### Test 2: Descargar PDF

1. En la página de confirmación
2. Click en **"Descargar Tickets PDF"**
3. Se descarga un PDF con todos los QR

### Test 3: Validar una Entrada

1. Copia la URL de uno de los QR mostrados
   - Ejemplo: `http://localhost:3000/validar/abc123...`
2. Pégala en una nueva pestaña
3. Verás los datos del comprador
4. Click en **"Validar Entrada Ahora"**
5. ✅ La entrada queda marcada como usada
6. Si recargas, verá "Ya fue validada" (no se puede usar 2 veces)

### Test 4: Panel de Admin

1. Accede a: `http://localhost:3000/admin`
2. Verás estadísticas en tiempo real:
   - Total de órdenes
   - Entradas vendidas
   - Ingresos generados
   - Órdenes validadas
3. Busca por nombre, email o DNI
4. Filtra por tipo de entrada

---

## 📍 URLs del Sistema

| Página | URL | Descripción |
|--------|-----|-------------|
| **Inicio** | `/` | Landing page del festival |
| **Comprar** | `/comprar` | Formulario de compra |
| **Ticket** | `/ticket/[id]` | Ver ticket comprado |
| **Validar** | `/validar/[entryId]` | Validar entrada con QR |
| **Admin** | `/admin` | Panel de administración |

---

## 🎫 Tipos de Entrada

| Tipo | Precio | Beneficios |
|------|--------|-----------|
| **General** | S/ 50 | Acceso básico al festival |
| **VIP** | S/ 100 | Zona preferencial + barra exclusiva |
| **Platino** | S/ 200 | Todo VIP + Meet & Greet + regalo |

---

## 💾 Datos de Prueba

Usa estos datos para probar rápidamente:

```
Nombre: Carlos Méndez
DNI: 87654321
Email: carlos@test.com
Teléfono: 987654321
```

```
Nombre: Ana Torres
DNI: 45678912
Email: ana@test.com
Teléfono: 912345678
```

---

## 🔧 Comandos Útiles

```bash
# Iniciar desarrollo
npm run dev

# Compilar para producción
npm run build

# Iniciar en producción
npm run start

# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm install

# Ver errores de TypeScript
npm run lint
```

---

## 🐛 Solución de Problemas

### El servidor no inicia

```bash
# Verifica que Node.js esté instalado
node --version  # Debe ser 18 o superior

# Reinstala dependencias
npm install
```

### "Port 3000 already in use"

```bash
# Usa otro puerto
PORT=3001 npm run dev

# O mata el proceso en puerto 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID [número] /F

# Linux/Mac:
lsof -ti:3000 | xargs kill
```

### No se generan los QR

Asegúrate de que las dependencias estén instaladas:
```bash
npm install qrcode @types/qrcode jspdf html2canvas uuid @types/uuid
```

### Los datos no se guardan

Esto es normal - usa **localStorage** del navegador:
- Los datos solo existen en TU navegador
- Si borras el caché, se pierden
- En producción, usar base de datos real

---

## 📊 Flujo Completo de Usuario

```
1. Usuario visita festival-cubanada.com
   ↓
2. Lee información del evento
   ↓
3. Click en "Comprar Entradas"
   ↓
4. Selecciona tipo y cantidad
   ↓
5. Llena datos personales
   ↓
6. Realiza pago (simulado)
   ↓
7. Recibe ticket digital con QR únicos
   ↓
8. Descarga PDF
   ↓
9. El día del evento, presenta QR
   ↓
10. Personal escanea QR
   ↓
11. Sistema valida y marca como usada
   ↓
12. ¡Usuario ingresa al festival! 🎉
```

---

## 🔐 Seguridad del Sistema

### ✅ Lo que SÍ hace:
- Genera IDs únicos imposibles de adivinar
- Cada QR solo se puede usar UNA vez
- Marca automáticamente entradas como usadas
- Registra timestamp de validación

### ⚠️ Para producción necesitas:
- Base de datos real (PostgreSQL/MySQL)
- Pasarela de pago real (Niubiz, Culqi, etc.)
- HTTPS/SSL
- Autenticación de admin
- Envío real de emails
- Backups automáticos

---

## 📧 Siguiente Paso: Email

Para enviar emails automáticamente, integra **Resend**:

1. Crea cuenta en [resend.com](https://resend.com)
2. Obtén tu API Key
3. Instala:
   ```bash
   npm install resend
   ```
4. Agrega en `.env.local`:
   ```
   RESEND_API_KEY=tu_api_key_aqui
   ```
5. En producción, los tickets se enviarán automáticamente

---

## 🌐 Deploy a Producción

### Opción 1: Vercel (Más fácil)

```bash
npm install -g vercel
vercel login
vercel deploy
```

### Opción 2: Netlify

```bash
npm run build
# Sube la carpeta .next a Netlify
```

### Opción 3: Tu propio servidor

```bash
npm run build
npm run start  # Corre en puerto 3000
```

---

## 📱 Contacto y Soporte

Si tienes dudas:

1. Revisa el **README.md** completo
2. Revisa la consola del navegador (F12)
3. Contacta a Perion Entertainment

---

## ✨ Características Destacadas

✅ **Diseño tropical vibrante**
✅ **100% responsive** (móvil, tablet, desktop)
✅ **Compra online automatizada**
✅ **QR únicos por entrada**
✅ **Validación anti-duplicados**
✅ **Panel de administración completo**
✅ **Generación de PDF**
✅ **Estadísticas en tiempo real**
✅ **Búsqueda y filtros**
✅ **Sistema escalable y reutilizable**

---

## 🎯 Checklist de Producción

Antes de lanzar en vivo:

- [ ] Migrar a base de datos real
- [ ] Integrar pasarela de pago
- [ ] Configurar envío de emails
- [ ] Añadir autenticación de admin
- [ ] Configurar dominio personalizado
- [ ] Habilitar HTTPS
- [ ] Configurar backups automáticos
- [ ] Probar en diferentes navegadores
- [ ] Probar en móviles
- [ ] Configurar analytics (Google Analytics)
- [ ] Crear política de privacidad
- [ ] Términos y condiciones
- [ ] Probar carga con múltiples usuarios
- [ ] Configurar rate limiting
- [ ] Añadir captcha al formulario

---

**¡Éxito con el Festival Cubanada! 🎵🌴**
