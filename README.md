# 🏪 Sistema de Gestión de Ventas e Inventario — MINISO

> **Sistema de Gestión de Ventas e Inventario**  


🌐 **Demo en vivo:** [miniso-web-omega.vercel.app](https://miniso-web-omega.vercel.app)

---
## 🎥 Demo

Login Admin:
https://github.com/user-attachments/assets/909aa543-097b-4e13-a8dd-8dc2617c9881

<img width="1875" height="897" alt="image" src="https://github.com/user-attachments/assets/a8c7f462-b1d5-45bb-ba55-59e584df4f31" />

## 📋 Resumen

Sistema web integral de punto de venta (POS) y gestión de inventarios desarrollado para una tienda minorista multiproducto. Automatiza los procesos críticos de facturación, devoluciones, abastecimiento y control de existencias, eliminando el uso de registros manuales y hojas de cálculo.


## 🛠️ Stack Tecnológico

https://github.com/user-attachments/assets/97c5ef46-e0ef-4adb-8b36-fa6a2d0c9e2b



| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 · CSS3 · JavaScript  |
| Backend | Node.js · Express.js |
| Base de datos | Supabase (PostgreSQL) |
| Modelado UML | Modelio |
| Deploy Frontend | Vercel |
| Deploy Backend | Render |
| Arquitectura | MVC + Patrón DAO (3 capas) |

---

## 🏗️ Arquitectura del Sistema

El sistema implementa una **arquitectura en tres capas** con el patrón **Data Access Object (DAO)**, garantizando acoplamiento mínimo y cohesión máxima:

```
┌─────────────────────────────────────────────────┐
│            CAPA DE PRESENTACIÓN                 │
│      HTML / CSS / JavaScript — Vercel           │
│    Cajero · Administrador · Almacenero          │
└────────────────────┬────────────────────────────┘
                     │ HTTP / REST API
┌────────────────────▼────────────────────────────┐
│          CAPA DE NEGOCIO — Render               │
│           Node.js + Express.js                  │
│  ClienteService · VentaService                  │
│  OrdenCompraService · EntradaService            │
└────────────────────┬────────────────────────────┘
                     │ Patrón DAO
┌────────────────────▼────────────────────────────┐
│          CAPA DE DATOS — Supabase               │
│              PostgreSQL (Cloud)                 │
│  ClienteDAO · ProductoDAO · VentaDAO            │
│  ProveedorDAO · OrdenCompraDAO                  │
└─────────────────────────────────────────────────┘
```

> Si se migra la base de datos, solo se reemplaza la capa DAO sin tocar la lógica de negocio.

---

## 👤 Roles y Funcionalidades

### 🛒 Cajero
- Registrar ventas con búsqueda de productos por nombre o código
- Asociar clientes del programa de fidelización por DNI
- Registrar devoluciones con validación de ticket, motivo y monto
- Gestionar clientes con verificación de duplicidad

### ⚙️ Administrador
- Mantener catálogo de productos y proveedores (CRUD completo)
- Generar órdenes de compra vinculadas a alertas de stock crítico
- Reportes analíticos por rango de fechas con gráfico de barras y exportación CSV
- Gestión de usuarios y control de acceso por roles (RBAC)

### 🏭 Almacenero
- Registrar entradas de inventario asociadas a órdenes de compra
- Monitorear productos agotados con alertas visuales
- Reporte de inventario valorizado

---

## 🗄️ Modelo de Base de Datos

**9 tablas** + **3 vistas** para reportes:

```
usuario
cliente ──────────────────────────┐
proveedor ──────────┐             │
producto ───────────┤             │
                    ▼             ▼
            detalle_orden_compra  detalle_venta
                    │             │
            orden_compra        venta
                    │
            entrada_inventario
```

**Vistas:**
- `v_reporte_ventas` — consulta por rango de fechas
- `v_productos_stock_bajo` — alertas de reposición
- `v_reporte_inventario` — valorización del stock

---

## 📊 Diagramas UML

Modelados en **Modelio** siguiendo la metodología ADOO:

| Diagrama | Descripción |
|----------|-------------|
| Casos de Uso | 3 actores · 14 casos de uso |
| Secuencia — Registrar Venta | Verificación de stock · POS completo |
| Secuencia — Registrar Cliente | Validación de duplicidad por DNI |
| Secuencia — Generar Orden de Compra | Buscar proveedor · agregar productos |
| Secuencia — Registrar Devolución | Validación de ticket · motivo · monto |
| Secuencia — Generar Reporte | Filtro por fechas · gráfico · exportar |
| Diagrama de Clases | Arquitectura DAO completa |
| Diagrama de Componentes | Módulos del sistema |
| Diagrama de Despliegue | Infraestructura cloud |

> 📁 Ver diagramas en [`/docs/diagramas/`](./docs/diagramas/)

---

## 📁 Estructura del Proyecto

```
miniso_web/
├── index.html                   # Punto de entrada del frontend
├── css/
│   └── styles.css               # Sistema de diseño MINISO
├── js/
│   ├── api.js                   # Capa de comunicación REST
│   ├── app.js                   # Estado global y navegación
│   └── pages.js                 # Renderizado de las 13 pantallas
├── backend/
│   ├── server.js                # Servidor Express
│   ├── .env.example             # Plantilla de credenciales
│   ├── config/
│   │   └── supabase.js          # Conexión a Supabase (DAOFactory)
│   ├── dao/                     # Acceso a datos
│   │   ├── UsuarioDAO.js
│   │   ├── ClienteDAO.js
│   │   ├── ProductoDAO.js
│   │   ├── ProveedorDAO.js
│   │   ├── VentaDAO.js
│   │   └── OrdenCompraDAO.js
│   ├── service/                 # Lógica de negocio
│   │   ├── ClienteService.js
│   │   ├── VentaService.js
│   │   ├── OrdenCompraService.js
│   │   └── EntradaService.js
│   └── routes/
│       └── api.js               # Endpoints REST
└── docs/
    ├── informe_diarso.pdf       # Documentación técnica (91 págs.)
    ├── miniso_supabase.sql      # Script de base de datos
    └── diagramas/               # Diagramas UML exportados
```

---

## 🚀 Instalación Local

### Requisitos
- Node.js v18+
- Cuenta gratuita en [Supabase](https://supabase.com)

### 1. Clonar el repositorio
```bash
git clone https://github.com/fbjfernandez/miniso_web.git
cd miniso_web
```

### 2. Configurar la base de datos
1. Crear un proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar [`docs/miniso_supabase.sql`](./docs/miniso_supabase.sql)
3. En **Settings → API** copiar la `Project URL` y la `anon public key`

### 3. Variables de entorno
```bash
cd backend
cp .env.example .env
```
Editar `.env`:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...
PORT=3000
```

### 4. Iniciar el servidor
```bash
cd backend
npm install
node server.js
```

### 5. Abrir el frontend
Abrir `index.html` con **Live Server** en VS Code.

---

## 🔑 Cuentas de prueba

| Usuario | Contraseña | Rol |
|---------|:---:|-----|
| `cajero01` | `1234` | Cajero |
| `admin01` | `1234` | Administrador |
| `almacen01` | `1234` | Almacenero |

---

## 📡 API REST

```
POST   /api/login
GET    /api/clientes              POST /api/clientes
PUT    /api/clientes/:id
GET    /api/productos             POST /api/productos
GET    /api/productos/stock-bajo
PUT    /api/productos/:id
GET    /api/proveedores           POST /api/proveedores
GET    /api/ventas                POST /api/ventas
GET    /api/ventas/:id/detalle
PUT    /api/ventas/:id/devolucion
GET    /api/ordenes-compra        POST /api/ordenes-compra
GET    /api/entradas              POST /api/entradas
GET    /api/reportes/ventas
GET    /api/reportes/inventario
```

---
