# 💡 Ejemplos de Uso - Festival Cubanada

## 🎯 Escenarios Reales de Uso

---

## Escenario 1: Comprador Individual

### María quiere comprar 1 entrada VIP

**Paso a paso:**

1. **Accede al sitio**
   ```
   https://festival-cubanada.com
   ```

2. **Explora la información**
   - Lee sobre el festival
   - Ve los artistas
   - Revisa los precios

3. **Decide comprar VIP (S/ 100)**
   - Click en "Comprar Entradas"
   - Selecciona "VIP"
   - Cantidad: 1

4. **Completa sus datos**
   ```
   Nombre: María González Pérez
   DNI: 45678912
   Email: maria.gonzalez@gmail.com
   Teléfono: 987654321
   ```

5. **Realiza el pago**
   - Total: S/ 100.00
   - Método: Visa/Mastercard
   - Confirma

6. **Recibe su ticket**
   - Email con confirmación
   - PDF descargable
   - 1 código QR único

7. **El día del evento**
   - Llega a las 19:30 (30 min antes)
   - Muestra su QR en la entrada
   - Personal escanea → Sistema valida
   - ✅ Ingresa a zona VIP

---

## Escenario 2: Grupo de Amigos

### Carlos compra 5 entradas General para sus amigos

**Proceso:**

1. **Compra grupal**
   - Tipo: General
   - Cantidad: 5
   - Total: S/ 250.00

2. **Datos del comprador (Carlos)**
   ```
   Nombre: Carlos Ramírez Torres
   DNI: 12345678
   Email: carlos.ramirez@hotmail.com
   Teléfono: 912345678
   ```

3. **Recibe 1 PDF con 5 QR diferentes**
   - Entrada 1: QR #abc123...
   - Entrada 2: QR #def456...
   - Entrada 3: QR #ghi789...
   - Entrada 4: QR #jkl012...
   - Entrada 5: QR #mno345...

4. **Comparte con sus amigos**
   - Envía el PDF por WhatsApp
   - O captura de pantalla de cada QR individual
   - Cada amigo tiene su propio código

5. **El día del evento**
   - Los 5 llegan juntos
   - Cada uno muestra su QR
   - Todos ingresan sin problemas

**✅ Ventaja**: Un solo pago, múltiples entradas independientes

---

## Escenario 3: Compra Premium

### Ana quiere la experiencia completa - Platino

**Por qué elige Platino (S/ 200):**

- Zona premium cercana al escenario
- Meet & Greet con artistas
- Regalo exclusivo
- Servicio VIP
- Bar exclusivo

**Proceso:**

1. Click en "Comprar Platino"
2. Completa datos
3. Paga S/ 200.00
4. Recibe ticket especial con beneficios detallados

**El día del evento:**

1. Ingresa por entrada exclusiva Platino
2. Recibe pulsera identificadora
3. Accede a zona premium
4. A las 19:00: Meet & Greet con artistas
5. Recibe merchandising exclusivo
6. Disfruta del concierto desde zona preferencial

---

## Escenario 4: Regalo de Cumpleaños

### Roberto regala 2 entradas VIP a su esposa

**Proceso:**

1. **Compra 2 VIP (S/ 200)**
   - Datos del comprador: Roberto
   - Email: roberto@email.com

2. **Descarga el PDF**
   - Imprime los 2 QR
   - Los pone en una tarjeta de cumpleaños

3. **El día del cumpleaños**
   - Sorprende a su esposa con las entradas
   - Ella está emocionada

4. **El día del festival**
   - Van juntos
   - Cada uno muestra su QR
   - Disfrutan del concierto

**✅ Transferencia**: Las entradas son transferibles, no hay problema

---

## Escenario 5: Validación en Puerta

### Personal de seguridad valida entradas

**Herramientas necesarias:**

- Smartphone o tablet
- Conexión a internet
- Lector de QR (app de cámara)

**Flujo de validación:**

1. **Asistente llega a la entrada**
   - Muestra su QR (en pantalla o impreso)

2. **Personal escanea el QR**
   - Abre app de cámara
   - Escanea código
   - Redirige a: `festival-cubanada.com/validar/[id]`

3. **Sistema muestra información:**
   ```
   ✓ ENTRADA VÁLIDA

   Comprador: María González Pérez
   DNI: 45678912
   Tipo: VIP
   Estado: PENDIENTE
   ```

4. **Personal verifica:**
   - ¿Coincide el DNI con identificación?
   - ¿Es la zona correcta (General/VIP/Platino)?

5. **Personal valida:**
   - Click en "Validar Entrada Ahora"
   - Sistema marca como USADA
   - Asistente ingresa

6. **Si alguien intenta usar el mismo QR:**
   ```
   ⚠️ ENTRADA YA VALIDADA

   Esta entrada fue usada anteriormente
   Fecha: 15/04/2026 20:15

   ❌ RECHAZAR INGRESO
   ```

---

## Escenario 6: Intento de Falsificación

### Alguien intenta usar un QR falso

**Caso 1: QR inventado**

```
Sistema: ❌ ENTRADA NO ENCONTRADA
Esta entrada no existe en nuestra base de datos
```

**Acción**: Rechazar ingreso y contactar seguridad

**Caso 2: QR duplicado (screenshot)**

```
Primera persona: ✓ Validada exitosamente → Ingresa
Segunda persona: ⚠️ Ya fue validada → RECHAZADA
```

**Acción**: Verificar identidad, posible reventa no autorizada

**Caso 3: QR de otro evento**

```
Sistema: ❌ Entrada inválida
El código no corresponde a este evento
```

---

## Escenario 7: Problemas Comunes

### Problema 1: "Perdí mi ticket"

**Solución:**

1. Comprador busca email de confirmación
2. Descarga nuevamente el PDF
3. O contacta a soporte con:
   - Nombre completo
   - DNI usado en compra
   - Email de compra

4. Admin busca en panel: `/admin`
5. Encuentra la orden
6. Reenvía confirmación

### Problema 2: "Mi teléfono se quedó sin batería"

**Solución A: Impreso**
- Llevar QR impreso (backup recomendado)

**Solución B: Email**
- Acceder desde otro dispositivo
- Mostrar email con QR

**Solución C: Soporte en puerta**
- Personal verifica DNI
- Busca en sistema por DNI
- Valida manualmente

### Problema 3: "Compré por error General en vez de VIP"

**Antes del evento:**
- Contactar a soporte
- Puede hacer upgrade pagando diferencia
- Se genera nuevo ticket

**Durante el evento:**
- No se pueden hacer cambios
- Entradas son finales

---

## Escenario 8: Administrador Revisa Ventas

### Admin quiere ver estadísticas del día

**Acceso:**

```
https://festival-cubanada.com/admin
```

**Ve en tiempo real:**

```
📊 DASHBOARD

📦 Órdenes Totales: 487
🎫 Entradas Vendidas: 1,245
💰 Ingresos: S/ 98,750.00
✅ Validadas: 234
```

**Desglose por tipo:**

```
GENERAL:  750 entradas → S/ 37,500
VIP:      420 entradas → S/ 42,000
PLATINO:   75 entradas → S/ 15,000
```

**Búsqueda rápida:**

```
Buscar: "maria gonzalez"
Resultado: 1 orden encontrada
#a8f3d921 | María González | VIP | S/ 100
```

---

## Escenario 9: Día del Evento - Flujo Completo

### Timeline del día 15 de Abril, 2026

**17:00 - Montaje final**
- Personal técnico llega
- Pruebas de sonido
- Sistema de validación activo

**18:00 - Apertura de puertas**
- Primeros asistentes llegan
- 3 puntos de validación activos
- Flujo: 1 persona cada 10 segundos

**18:30 - Primeros ingresos**
- 150 personas validadas
- Sistema funcionando perfectamente
- 0 rechazos por errores técnicos

**19:30 - Pico de ingresos**
- 800 personas validadas
- Pequeña cola en General
- VIP y Platino sin espera

**20:00 - Inicio del concierto**
- 1,100 personas dentro
- Validaciones continúan
- Personal activo en entradas

**22:00 - Último ingreso**
- Total validado: 1,245 entradas
- Coincide con ventas online
- 0 fraudes detectados

**01:00 - Fin del evento**
- Evento exitoso
- Sistema funcionó al 100%

---

## 🔢 Estadísticas Ejemplo

### Después de 1 semana de ventas:

```
Total Órdenes: 487
Total Entradas: 1,245

Distribución:
├─ General:  750 (60%)
├─ VIP:      420 (34%)
└─ Platino:   75 (6%)

Ingresos: S/ 98,750
Promedio por orden: S/ 202.67
Promedio por entrada: S/ 79.32

Canales:
├─ Web directa: 95%
├─ Móvil: 5%

Métodos de pago:
├─ Visa: 60%
├─ Mastercard: 30%
├─ Otros: 10%

Horarios de compra:
├─ Mañana (6am-12pm): 15%
├─ Tarde (12pm-6pm): 35%
├─ Noche (6pm-12am): 40%
├─ Madrugada (12am-6am): 10%
```

---

## 🎓 Mejores Prácticas

### Para Compradores:

✅ Compra con anticipación
✅ Guarda el PDF en varios lugares
✅ Haz captura de pantalla del QR
✅ Llega temprano al evento
✅ Trae identificación
✅ Considera tener backup impreso

### Para Organizadores:

✅ Prueba el sistema antes del evento
✅ Capacita al personal de validación
✅ Ten backup de internet (hotspot móvil)
✅ Prepara protocolo para casos especiales
✅ Monitorea estadísticas en tiempo real
✅ Ten soporte técnico disponible

### Para Personal de Validación:

✅ Verifica que el QR sea del evento correcto
✅ Compara DNI con datos mostrados
✅ No dejes validar entradas ya usadas
✅ Reporta intentos de fraude
✅ Sé amable pero firme
✅ Conoce el protocolo de problemas técnicos

---

**¡Éxito con el Festival Cubanada! 🎵**
