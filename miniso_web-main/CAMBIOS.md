# Qué se completó (v2)

## Lo que NO era funcional y ahora sí
| Módulo | Antes | Ahora |
|---|---|---|
| Productos (crear/editar) | Solo en memoria del navegador, se perdía al recargar | Guarda en BD con validaciones; campo costo |
| Proveedores (crear/editar) | Solo en memoria; RUC duplicado validado solo en pantalla | Guarda en BD; RUC de 11 dígitos y único |
| Órdenes de compra | Solo en memoria; costo fijo = 50 % del precio | Se graba cabecera+detalle en una transacción; costo editable; ver detalle; cancelar |
| Entradas de almacén | Solo en memoria; cargaba 3 productos al azar | Usa el detalle real de la orden; suma stock y cierra la orden en una transacción; historial |
| Devoluciones | Solo cambiaba el estado de la venta | Parcial o total; repone stock; descuenta puntos; guarda motivo y monto; historial |
| Dashboard Almacenero / Cajero | Se rompía (403 al pedir datos de otros roles) | Cada rol carga solo lo que puede ver |
| Usuarios | No había forma de desbloquear/desactivar | Activar, desactivar y desbloquear cuentas |
| Reportes | CSV de inventario exportaba ventas; gráfico deformado | Corregidos; totales netos de devoluciones |

## Errores corregidos
- La venta **descontaba el stock dos veces** (en el RPC y otra vez en Node).
- `package.json` apuntaba a `Server.js` (falla en Linux/Render); archivo duplicado `backend/api.js` eliminado.
- Tras vender, el stock del POS quedaba desactualizado; registrar un cliente desde la venta borraba el carrito.
- Fechas en UTC (una venta de las 8 pm aparecía "mañana"): ahora hora de Lima.
- Contador de intentos fallidos no era atómico.

## Seguridad
- Rol por **token firmado** (antes cualquiera podía enviar `x-user-role: Administrador`).
- Cajero/admin/almacenero y precios se toman en el servidor.
- Escape de HTML (XSS) en todo texto ingresado por usuarios; CSV protegido contra inyección de fórmulas.
- `PUT /usuarios` solo acepta campos permitidos; un admin no puede desactivarse a sí mismo.
- CORS configurable por variable `ALLOWED_ORIGINS`; el servidor no arranca sin `JWT_SECRET`.

## Base de datos (`database/01_completar_bd.sql`)
Se ejecuta sobre la BD existente (no borra datos). Incluye:
- **Stock automático**: la venta descuenta; la entrada de almacén y la devolución aumentan; anular un detalle de venta o de entrada revierte el stock. Cada movimiento queda en `movimiento_inventario` (kardex).
- **Triggers de integridad**: valida stock/cantidad/producto activo antes de vender (el precio lo fija la BD), estados de venta y de orden, bloqueo de usuario a los 5 intentos, protección del último administrador, auditoría de cambios.
- **Control de excepciones**: errores propios `MN001` (stock), `MN002` (dato inválido), `MN003` (regla de negocio), `MN004` (no encontrado) que el backend traduce a 409/400/404; sin `WHEN OTHERS` que oculte la causa.
- **Funciones atómicas**: `registrar_venta`, `registrar_devolucion`, `crear_orden_compra`, `registrar_entrada`, `registrar_intento_fallido`.
- **Restricciones CHECK** (precios, stock, cantidades, DNI, RUC, email), códigos automáticos (`C001`, `P001`, `PR001`, `OC001`, `E001`, `D001`) y vistas `v_reporte_ventas`, `v_productos_stock_bajo`, `v_reporte_inventario`.
