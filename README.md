<div align="center">

# 🛒 MINISO | Enterprise POS, Inventory & RBAC Engine `V1.01`

**Sistema POS e inventario con ventas atómicas, control de roles y protección anti-fuerza bruta.**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=black)

### 🚀 [**Ver Demo en Vivo →**](https://miniso-web-omega.vercel.app)

![Demo](docs/demo.gif)

</div>

---

## 🧪 Cómo probar la demo

1. Entra a la [demo](https://miniso-web-omega.vercel.app) e inicia sesión con un usuario de prueba:

| Rol | Usuario | Contraseña |
|---|---|---|
| 👑 Administrador | `admin01` | `1234` |
| 📦 Almacenero | `almacen01` | `1234` |
| 💳 Cajero | `cajero01` | `1234` |

2. Como **Cajero**: registra una venta y observa la boleta correlativa generada.
3. Intenta entrar a **Proveedores** u **Órdenes** con el Cajero → `403 Forbidden`.
4. Falla la contraseña **5 veces** seguidas → la cuenta queda bloqueada.

> ⏳ El backend corre en Render (plan gratuito): el primer login puede tardar ~30 s en despertar.

---

## ⚡ Soluciones Técnicas Clave

### 🧾 Cero Sobreventa · `POST /api/ventas`
- Lógica delegada al procedimiento almacenado nativo **`registrar_venta`** en PostgreSQL (RPC).
- En **una sola transacción atómica**:
  - Genera la boleta correlativa (ej. `B001-000001`).
  - Emite la nota de salida en almacén.
  - Descuenta el stock físico en tiempo real.

### 🔐 Control de Accesos (RBAC) · `HU-07`
- Middleware **`autorizarRoles`** que intercepta la cabecera `x-user-role`.
- Respuestas:
  - `401 Unauthorized` → cabecera omitida.
  - `403 Forbidden` → el rol (ej. *Cajero*) no tiene permisos sobre la ruta.

### 🛡️ Protección Anti-Fuerza Bruta · `HU-08` · `POST /api/login`
- Cifrado con **bcryptjs** (10 salt rounds).
- Sanitización del JSON de respuesta: la contraseña se elimina.
- Al acumular **5 `intentos_fallidos`** consecutivos, la BD actualiza `bloqueado = true` de forma atómica.
- Un login exitoso **resetea el contador a 0**.

---

## 🗂️ Matriz de Accesos Rápida

| Módulo | 👑 Administrador | 📦 Almacenero | 💳 Cajero |
|---|:---:|:---:|:---:|
| Ventas (POS) | ✅ | ❌ | ✅ |
| Inventario / Stock | ✅ | ✅ | 👁️ Solo lectura |
| Proveedores | ✅ | ✅ | ❌ |
| Órdenes de compra | ✅ | ✅ | ❌ |
| Usuarios y roles | ✅ | ❌ | ❌ |

> 👁️ = solo consulta · ❌ = `403 Forbidden`

---

## 🎬 Guía de Evidencias

| # | Evidencia | Qué verificar |
|---|---|---|
| 1 | **🗄️ Supabase** | Hashes seguros (`$2a$10$...`) en la tabla `usuario` y conmutación de la columna `bloqueado`. |
| 2 | **🌐 Consola de Red** (`F12` → Network) | Errores en rojo `403 Forbidden` al acceder a rutas de proveedores u órdenes desde una sesión de **Cajero**. |
| 3 | **🧩 Soporte SQL** | Inicialización del entorno respaldada por la extensión nativa **`pgcrypto`**. |

<details>
<summary>📸 Ver capturas</summary>

| 403 en Network |
|---|
| <img width="617" height="304" alt="image" src="https://github.com/user-attachments/assets/c5f67348-2496-43cd-a89e-e1063b6ec7e6" />

| Supabase en tiempo real |
|---|
| <img width="1548" height="403" alt="image" src="https://github.com/user-attachments/assets/faef1be0-d4b0-49e3-acfc-754bf2890e1b" />
| <img width="1454" height="346" alt="image" src="https://github.com/user-attachments/assets/19d11ebc-423d-4f4c-8808-b233ef632219" />




</details>

---

<div align="center">

**Frontend:** Vercel · **Backend:** Render · **DB:** Supabase (PostgreSQL)

</div>
## 👨‍💻 Información de Contacto

* **LinkedIn:** [[Fernando Fernandez](https://www.linkedin.com/in/fernando-fernandez-navarrete/)]
* **Portafolio Profesional:** [[@fbjfernandez](https://github.com/fbjfernandez)]
* **Correo Electrónico:** [fbjfernandez8103@gmail.com](fbjfernandez8103@gmail.com)
