# Sistema POS (Punto de Venta) - Arquitectura y Estructura

Este proyecto está organizado en una arquitectura desacoplada y modular, diseñada específicamente para entornos de Punto de Venta (alta velocidad, soporte para lectores de código de barras, control de caja y tickets térmicos).

---

## 📁 Estructura General del Proyecto

```text
proyecto-POS/
├── backend/                  # Servidor de API REST, base de datos y lógica de negocio
├── frontend/                 # Aplicación Web POS (Interfaz rápida para cajero y administración)
└── docs/                     # Documentación de arquitectura, diagramas y configuración de hardware
```

---

## 🛠️ Arquitectura del Backend (`/backend`)

El backend utiliza una **Arquitectura Modular por Dominio (Vertical Slices)**. Cada módulo agrupa su controlador, servicio, rutas y validaciones.

```text
backend/
├── prisma/                       # Modelado de datos, migraciones y esquemas de BD
├── src/
│   ├── config/                   # Variables de entorno, conexión a BD, constantes
│   ├── middlewares/              # Autenticación JWT, control de roles, manejo de errores
│   ├── common/                   # Código compartido entre módulos
│   │   ├── errors/               # Clases de error personalizadas (NotFound, BadRequest, etc.)
│   │   └── utils/                # Utilidades generales (fechas, formateadores)
│   ├── modules/                  # Módulos de negocio (independientes y desacoplados)
│   │   ├── auth/                 # Login, permisos y control de roles (Admin, Cajero)
│   │   ├── products/             # Búsqueda por Código de Barras, SKU, precios, categorías
│   │   ├── inventory/            # Kardex, ajustes de stock y alertas de mínimo
│   │   ├── sales/                # Registro de ventas, transacción atómica de stock y folios
│   │   ├── cash-register/        # Control de Turnos: Apertura y Cierre de Caja (Arqueo)
│   │   ├── customers/            # Gestión de clientes (DNI, RUC, Cliente Genérico)
│   │   ├── printers/             # Configuración de impresoras térmicas (58mm/80mm)
│   │   └── electronic-billing/   # Módulo desacoplado para SUNAT / APIs de facturación
```

### Rol de los módulos clave del Backend:
* **`products`:** Búsqueda optimizada por `barcode` para que el escaneo responda en milisegundos.
* **`sales`:** Garantiza transacciones ACID (si se cobra la venta, se descuenta el stock en una sola transacción sin inconsistencias).
* **`cash-register`:** Imprescindible en un POS para controlar con cuánto dinero inició el turno el cajero, cuánto cobró en efectivo/tarjeta y cuadrar la caja al final del día.
* **`electronic-billing`:** Diseñado como adaptador independiente. Si el cliente emite tickets internos, este módulo no interfiere; cuando decida conectar SUNAT/PSE, solo se implementa el conector aquí sin tocar las ventas.

---

## 💻 Arquitectura del Frontend (`/frontend`)

El frontend está diseñado pensando en la ergonomía y velocidad del cajero: cero dependencia obligatoria del mouse, uso de atajos de teclado y captura automática de la pistola de código de barras.

```text
frontend/
├── public/                       # Archivos estáticos
├── src/
│   ├── assets/
│   │   ├── icons/                # Iconos SVG de interfaz
│   │   └── sounds/               # Sonidos de confirmación (beep al escanear, alerta de error)
│   ├── components/
│   │   ├── ui/                   # Botones, inputs numéricos, modales, tablas (diseño base)
│   │   ├── layout/               # Barra superior, barra de estado de caja y turno
│   │   └── feedback/             # Notificaciones toast, diálogos de confirmación
│   ├── hooks/                    # Hooks especializados en hardware
│   │   ├── useBarcodeScanner.ts  # Captura automática de escaneo de la pistola
│   │   ├── useHotkeys.ts         # Atajos de teclado (F2: Cobrar, F4: Cliente, Esc: Cancelar)
│   │   └── useThermalPrinter.ts  # Disparador de impresión de tickets
│   ├── modules/                  # Vistas y componentes por pantalla
│   │   ├── pos/                  # Terminal de venta (Buscador, Carrito, Modal de Cobro)
│   │   ├── products/             # Catálogo de productos y alta con código de barras
│   │   ├── inventory/            # Movimientos de stock y conteo físico
│   │   ├── cash-register/        # Ventana de apertura/cierre de turno y arqueo de efectivo
│   │   ├── sales-history/        # Historial de ventas del día y reimpresión de tickets
│   │   └── tickets/              # Plantillas visuales de tickets (58mm y 80mm en CSS)
│   ├── services/                 # Llamadas a las APIs del Backend
│   ├── stores/                   # Estado global con Zustand
│   │   ├── cartStore.ts          # Items en carrito, cantidades, descuentos, cálculo de vuelto
│   │   └── sessionStore.ts       # Usuario activo, caja abierta actualmente
│   ├── types/                    # Interfaces y tipos compartidos (TypeScript)
│   ├── utils/                    # Formateo de moneda, validadores de DNI/RUC
│   └── routes/                   # Enrutamiento de la aplicación
```

---

## ⚡ Conexión con Hardware

1. **Pistola de Código de Barras (Lector USB):**
   * El hook `useBarcodeScanner.ts` escucha ráfagas de teclado en la ventana global. Al detectar caracteres rápidos seguidos de `Enter`, intercepta el código, emite un sonido de confirmación (`beep.mp3`) y consulta el producto para meterlo directo al carrito.

2. **Mini Impresora Térmica:**
   * Las plantillas en `src/modules/tickets/templates/` utilizan CSS `@media print` fijado a anchos de papel estándar (58mm o 80mm).
   * Al confirmar el pago, se dispara la orden de impresión sin descuadrar la interfaz del cajero.
