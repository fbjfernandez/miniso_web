# Auditoría real de calidad — MINISO Web POS

**Norma de referencia:** ISO/IEC 25010:2023 · **Fecha de ejecución:** 24/11/2026 (UTC-05:00)
**Commit analizado:** `33559261a80ea9fab806da3bd0e799edf97fe6ed` (rama `main`, 17/11/2026 14:18:29 -0500, *"Migrate Express backend to Vercel Serverless"*)

> **Declaración de integridad.** Toda cifra de este documento procede de ejecuciones reales
> reproducidas en `qa_evidencias/` o, cuando se indica explícitamente, de la ejecución externa
> de SonarCloud reportada por el usuario. No se inventaron resultados ni se falsificaron logs.
> **No se modificó ningún test** y el único archivo de aplicación tocado fue
> `frontend/js/pages.js` (una sola línea, `aria-label`, autorizado expresamente para corregir
> WCAG 4.1.2; ver §4.5). Antes de la auditoría el árbol ya estaba sucio (ver §1.1); esos
> cambios preexistentes no fueron tocados. Archivos nuevos: `sonar-project.properties`,
> `qa_audit_report.md` y artefactos de `qa_evidencias/`. La ejecución generó además, por diseño
> del propio `tests/conftest.py`, `resultados_tc10.csv` y capturas en `evidencias/`.

---

## Resumen ejecutivo (cifras crudas)

| Fase | Característica ISO 25010 | Métrica real | Valor |
|---|---|---|---|
| 1 | Adecuación funcional | Casos Selenium/pytest recolectados | **60** |
| 1 | — | Pruebas unitarias backend recolectadas | **26** |
| 2 | Adecuación funcional / Confiabilidad | Casos ejecutados | **60** (avance 100 %) |
| 2 | Corrección funcional | Pasados / Fallidos / Omitidos | **48 / 0 / 12** |
| 2 | Tasa de defectos (sobre ejecutados) | Fallos / ejecutados | **0 %** (0/48) |
| 2 | Cobertura de ejecución útil | Pasados / diseñados | **80 %** (48/60) |
| 2 | Confiabilidad | Backend unitario | **26/26 pasaron** en 2,68 s |
| 3 | Mantenibilidad | SonarCloud (reportado por el usuario, commit `33559261`) | 6,5 k LOC · 0,3 % duplicación · 10 mantenibilidad (A) · 26 fiabilidad (D) · 0 seguridad (A) |
| 4 | Capacidad de interacción | Violaciones axe antes de remediar (rules) Login / Ventas / Inventario | **1 / 2 / 1** |
| 4 | Capacidad de interacción | Violaciones axe críticas / serias (total nodos) | **1 regla crítica (5 nodos) / 3 reglas serias por pantalla (11 nodos; `color-contrast` repetida en 3 pantallas)** |
| 4 | Capacidad de interacción | Lighthouse Accesibilidad Login / Ventas / Inventario (antes) | **87 / 77 / 87** |
| 4 | Eficiencia (indicador web) | Lighthouse Performance Login / Ventas / Inventario | **99 / 99 / 99** |
| 4b | Capacidad de interacción | Ventas antes → después (reglas axe / Lighthouse a11y) | **2 → 1** / **77 → 92** |

**Lectura honesta:** la funcionalidad ejecutada no presentó fallos, pero **12 de 60 casos no
se ejecutaron** (10 protegidos por `RUN_DESTRUCTIVE` y 2 por falta de datos), por lo que el
80 % es el máximo que esta corrida cubre realmente. La accesibilidad automatizada sí mostró
defectos concretos, uno de impacto **crítico** en Ventas.

---

## FASE 1 — Inventario del proyecto y trazabilidad

### 1.1 Estructura, stack y versión

| Elemento | Realidad observada |
|---|---|
| Commit / fecha | `3355926` · 2026-11-17 14:18:29 -0500 · rama `main` |
| Versión declarada | **Oficial para el informe: 2.0.0** (`package.json` raíz y backend). README: `V1.01` → hallazgo menor de gestión de configuración |
| Backend | Node.js **24.13.0**, npm **11.6.2**, Express **4.19.2**, `@supabase/supabase-js` **2.119.0**, `@supabase/ssr` **0.12.7**, bcryptjs **3.0.3**, CORS **2.8.5**, dotenv **16.4.5** |
| Arquitectura | Serverless en Vercel (`api/index.js` → `backend/server.js`); `backend/app.js` monta `backend/routes/api.js` en `/api`. Existe `backend/api.js` duplicado y obsoleto (no se usa) |
| Base de datos | Supabase PostgreSQL externo; `database/01_completar_bd.sql` (717 líneas) con RPCs, triggers, vistas y códigos `MN001`–`MN004`. No hay migraciones versionadas en el repo |
| Frontend | Estático sin bundler: `index.html` + `js/api.js` + `js/app.js` + `js/pages.js` (1.753 líneas) + CSS (787 líneas); JWT en `sessionStorage`; `window.MINISO_API_URL \|\| '/api'` |
| Autenticación | JWT HS256, 8 h; `autorizarRoles` verifica firma; roles `Administrador`, `Almacenero`, `Cajero` |
| Pruebas Python | Python **3.13.14** (`venv/`), pytest **9.1.1**, selenium **4.51.0**, requests **2.34.2**, Chrome **158.0.8127.37** |
| Pruebas JS | `node --test` sobre `backend/test/*.test.js` (3 archivos) |
| Config | `pytest.ini`: `testpaths=tests`, marcadores `destructiva` y `solo_destructiva` con guarda `RUN_DESTRUCTIVE=1` |

**Estado del árbol de trabajo (preexistente, no modificado por la auditoría):**
`M AGENTS.md`, `M paginas/app_page.py`, `M pytest.ini`, `D resultados_tc10.csv`, `M tests/conftest.py`
y 11 archivos `tests/test_*.py` modificados; sin seguimiento: `resultados.csv`, `tests/api_auth.py`.
Esto afecta a la trazabilidad: el contenido ejecutado es el del **working tree**, no el del commit.

**Requisitos para levantar el entorno (verificado):**
- No existe script `npm run dev`; solo `start` y `test`. El frontend se sirve estático (p. ej. Live Server en 5500).
- Backend local: `cd backend && npm start` con `backend/.env` presente (credenciales reales de Supabase y JWT ya en el workspace). **Comprobado en vivo:** `GET http://localhost:3000/api/health` → `HTTP 200 {"status":"ok","runtime":"vercel-serverless"}`.
- CORS permitido: `localhost:5500`, `127.0.0.1:5500` y el origen de Vercel.
- Las pruebas apuntan por defecto a `https://miniso-web-omega.vercel.app/`; se pueden redirigir con `MINISO_URL` / `MINISO_API_URL`.

### 1.2 Inventario de casos de prueba (60)

Cada fila procede del código del test y su resultado del JUnit XML real. El detalle en CSV está en
`qa_evidencias/casos_kiwi.csv`.

| ID | Módulo / HU | Validaciones reales | Resultado | Motivo |
|---|---|---|---|---|
| TC8-01 | Flujo principal / HU-01 | Login con cajero01 y verificación del rol activo CAJERO; guarda TC8_Evidencia.png | PASÓ |  |
| HU01-01-Cajero | HU-01 Login | Ingresa con Cajero/Administrador/Almacenero y valida que el rol activo coincide | PASÓ |  |
| HU01-01-Administrador | HU-01 Login | Ingresa con Cajero/Administrador/Almacenero y valida que el rol activo coincide | PASÓ |  |
| HU01-01-Almacenero | HU-01 Login | Ingresa con Cajero/Administrador/Almacenero y valida que el rol activo coincide | PASÓ |  |
| HU01-02 | HU-01 Login | Muestra 'Credenciales inválidas' con usuario noexiste99 | PASÓ |  |
| HU01-03 | HU-01 Login | Validación HTML nativa: validationMessage no vacío, sin error de app ni rol activo | PASÓ |  |
| HU01-04 | HU-02 Cierre de sesión | Tras logout vuelve a hacerse visible el formulario de login | PASÓ |  |
| HU01-05 | HU-01 Login | Recarga la página y el rol Administrador permanece activo | PASÓ |  |
| HU08-01 | HU-08 Anti-fuerza bruta | 5 claves incorrectas con cuenta desechable; el 5.º mensaje indica 'bloqueado'; desbloquea y elimina la cuenta | OMITIDO | Modifica datos reales. Activa con RUN_DESTRUCTIVE=1 |
| M01-01 | M01 Registrar Venta | Selecciona cliente y producto, confirma venta, verifica comprobante y stock -1; rollback de venta/stock/puntos/control | OMITIDO | Modifica datos reales. Activa con RUN_DESTRUCTIVE=1 |
| M01-02 | M01 Registrar Venta | Clics por encima del stock; valida toast 'No hay más stock disponible' y cantidad = stock | PASÓ |  |
| M01-03 | M01 Registrar Venta | Confirma sin seleccionar cliente y valida mensaje que exige cliente | PASÓ |  |
| M02-01 | M02 Clientes | Registra cliente con DNI de 8 dígitos, valida toast y fila en tabla; elimina el cliente al final | OMITIDO | Modifica datos reales. Activa con RUN_DESTRUCTIVE=1 |
| M02-02 | M02 Clientes | Escribe 13 dígitos y valida que el campo queda en 8 | PASÓ |  |
| M02-03 | M02 Clientes | El servidor responde 'El DNI debe tener 8 dígitos' | PASÓ |  |
| M03-01 | M03 Devoluciones | Crea venta de prueba, busca por comprobante, elige motivo y confirma; limpia venta y devolución | OMITIDO | Modifica datos reales. Activa con RUN_DESTRUCTIVE=1 |
| M03-02 | M03 Devoluciones | Busca comprobante inexistente y valida 'Sin resultados' | PASÓ |  |
| M03-03 | M03 Devoluciones | Confirma sin seleccionar motivo y valida 'Selecciona un motivo para la devolución' | PASÓ |  |
| M04-01 | M04 Productos | Completa formulario, proveedor, valida registro y fila; elimina el producto al final | OMITIDO | Modifica datos reales. Activa con RUN_DESTRUCTIVE=1 |
| M04-02 | M04 Productos | rangeUnderflow en precio -0.01 y stock 0; stepMismatch en stock 1.5 | PASÓ |  |
| M04-03 | M04 Productos | valueMissing en nombre y proveedor; formulario inválido | PASÓ |  |
| M05-01 | M05 Proveedores | Registra proveedor con RUC de 11 dígitos, valida toast y fila; lo elimina al final | OMITIDO | Modifica datos reales. Activa con RUN_DESTRUCTIVE=1 |
| M05-02 | M05 Proveedores | patternMismatch con 10, válido con 11 y recorte a 11 con 13 | PASÓ |  |
| M05-03 | M05 Proveedores | patternMismatch en RUC, typeMismatch en email, formulario inválido | PASÓ |  |
| M06-01 | M06 Órdenes de compra | Elige proveedor y producto, graba orden, valida toast; elimina la orden creada | OMITIDO | Modifica datos reales. Activa con RUN_DESTRUCTIVE=1 |
| M06-02 | M06 Órdenes de compra | Quita la única unidad y valida 'Agrega productos a la orden' y total 0.00 | PASÓ |  |
| M06-03 | M06 Órdenes de compra | Valida 'Selecciona un proveedor para la orden' | PASÓ |  |
| M07-01 | M07 Reporte de Ventas | Presenta 'Total vendido en el período' y 'Detalle de ventas (' sin alerta de error | PASÓ |  |
| M07-02 | M07 Reporte de Ventas | Rango 2000-01-01 muestra 'Sin ventas en este período' y exportar avisa que no hay ventas | PASÓ |  |
| M07-03 | M07 Reporte de Ventas | Valida mensaje 'no puede ser mayor' | PASÓ |  |
| M08-01 | M08 Usuarios y roles | Crea usuario QA, valida toast y fila; elimina la cuenta al final | OMITIDO | Modifica datos reales. Activa con RUN_DESTRUCTIVE=1 |
| M08-02 | M08 Usuarios y roles | El servidor exige 'al menos 4 caracteres' | PASÓ |  |
| M08-03 | M08 Usuarios y roles | Intenta crear admin01 y valida mensaje 'ya existe' | PASÓ |  |
| M09-01 | M09 Registrar Entrada | Crea orden de prueba, recibe y confirma entrada, valida toast; elimina entrada y orden | OMITIDO | Modifica datos reales. Activa con RUN_DESTRUCTIVE=1 |
| M09-02 | M09 Registrar Entrada | Excede el máximo y baja de 1; valida tope = pedida y mínimo = 1 | OMITIDO | No hay órdenes pendientes (genera una como Administrador) |
| M09-03 | M09 Registrar Entrada | Quita todos los productos y valida 'Agrega al menos un producto recibido' | OMITIDO | No hay órdenes pendientes (genera una como Administrador) |
| M10-01 | M10 Productos Agotados | Valida encabezado y que cada fila tenga stock <= mínimo | PASÓ |  |
| M10-02 | M10 Productos Agotados | Fuerza DB.productos=[] y valida mensaje vacío sin alerta | PASÓ |  |
| M10-03 | M10 Productos Agotados | Sustituye el JWT por 'token-invalido', recarga y valida 'sesión expiró' y vuelta al login | PASÓ |  |
| M11-01 | M11 Reporte de Inventario | Suma el valor de las filas y lo compara con el indicador; compara conteo de productos | PASÓ |  |
| M11-02 | M11 Reporte de Inventario | Fuerza DB.productos=[] y valida 'S/ 0.00' y '0' | PASÓ |  |
| M11-03 | M11 Reporte de Inventario | Fuerza catálogo vacío y valida 'No hay productos para exportar' | PASÓ |  |
| HU07-01-Cajero | HU-07 RBAC / menú | Valida items visibles y ocultos para Cajero, Administrador y Almacenero | PASÓ |  |
| HU07-01-Administrador | HU-07 RBAC / menú | Valida items visibles y ocultos para Cajero, Administrador y Almacenero | PASÓ |  |
| HU07-01-Almacenero | HU-07 RBAC / menú | Valida items visibles y ocultos para Cajero, Administrador y Almacenero | PASÓ |  |
| HU07-02 | HU-07 RBAC / API | fetch autenticado a /usuarios desde sesión Cajero y valida HTTP 403 | PASÓ |  |
| TC-F-001 | TC-F / HU-01 | Login y valida texto CAJERO y ausencia del formulario | PASÓ |  |
| TC-F-002 | TC-F / HU-01 | Valida 'Credenciales inválidas' y hace login correcto para reiniciar contador | PASÓ |  |
| TC-F-003 | TC-F / HU-01 | Cuenta recursos /api/login antes y después; valida que no aumentan | PASÓ |  |
| TC-F-004 | TC-F / HU-01 | Tras login, el enlace 'Registrar Venta' está visible y se puede pulsar | PASÓ |  |
| TC-F-005 | TC-F / HU-02 | Pulsa logout y valida que reaparece el login | PASÓ |  |
| TC-F-006 | TC-F / HU-02 | Valida sessionStorage borrado y que al volver atrás no hay sidebar interno | PASÓ |  |
| TC-F-007 | TC-F / HU-02 | Limpia almacenamiento, recarga y valida login sin error | PASÓ |  |
| TC-F-011 | TC-F / HU-06 | Compara el conjunto exacto de 4 items del menú Cajero | PASÓ |  |
| TC-F-012 | TC-F / HU-06 | Compara el conjunto exacto de 4 items del menú Almacenero | PASÓ |  |
| TC-F-014 | TC-F / HU-07 | GET /usuarios con JWT de admin01 → HTTP 200 | PASÓ |  |
| TC-F-015 | TC-F / HU-07 | GET /usuarios con JWT de cajero01 → HTTP 403 | PASÓ |  |
| TC-F-016 | TC-F / HU-07 | GET /usuarios sin Authorization → HTTP 401 | PASÓ |  |
| TC-F-017 | TC-F / HU-07 | GET /usuarios con x-user-role=Administrador sin JWT → HTTP 401 | PASÓ |  |
| TC-F-020 | TC-F / HU-08 | 5 fallos → HTTP 403 'bloqueado'; clave correcta sigue rechazada; desbloquea en finally | OMITIDO | Modifica datos reales. Activa con RUN_DESTRUCTIVE=1 |

**Fuera de la recolección:** `tests/inspeccionar.py` (script manual de volcado de selectores, no
es un test) y `pruebas/tests/test_m01_registrar_venta.py` (copia antigua fuera de `testpaths`).

### 1.3 Kiwi TCMS

**No existe** `docker-compose.yml`, Dockerfile ni configuración de Kiwi en el repositorio, y
**Docker no está instalado** en esta máquina (`docker` no se reconoce en PATH). Por decisión
del usuario no se levantó ninguna instancia.

Propuesta mínima para levantarlo en local (no ejecutada; verificar variables según la versión
de la imagen):

```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: kiwi
      POSTGRES_USER: kiwi
      POSTGRES_PASSWORD: <password-local>
    volumes:
      - kiwi_db:/var/lib/postgresql/data
  kiwi:
    image: kiwitcms/kiwi:latest
    depends_on: [db]
    ports:
      - "8080:8080"
    environment:
      KIWI_DB_ENGINE: django.db.backends.postgresql
      KIWI_DB_NAME: kiwi
      KIWI_DB_USER: kiwi
      KIWI_DB_PASSWORD: <password-local>
      KIWI_DB_HOST: db
      KIWI_DB_PORT: "5432"
      KIWI_ADMIN_EMAIL: admin@localhost
      KIWI_ADMIN_PASSWORD: <password-local>
      KIWI_SECRET_KEY: <generar-clave-aleatoria>
      KIWI_ALLOWED_HOSTS: localhost,127.0.0.1
      KIWI_SITE_URL: http://localhost:8080/
volumes:
  kiwi_db:
```

Comandos: `docker compose up -d` → abrir `http://localhost:8080/` → completar el asistente
inicial. Para cargar los casos, usar el CSV `qa_evidencias/casos_kiwi.csv` (columnas:
`Case ID, Módulo/HU, Título, Type, Prioridad, Validaciones reales, Resultado, Motivo,
Fecha ejecución, Evidencia`) desde la función de importación de la versión de Kiwi instalada
o mediante el cliente `tcms-api`. **El mecanismo de importación no fue probado.**

---

## FASE 2 — Ejecución real de pruebas

### 2.1 Comando y entorno

```
venv\Scripts\python.exe -m pytest -v -ra --junitxml=qa_evidencias/pytest_results_20261124_214347.xml
HEADLESS=1 · objetivo: https://miniso-web-omega.vercel.app/ · Chrome 158 headless
```

- **Inicio:** 2026-11-24T21:43:47.8222727-05:00
- **Fin:** 2026-11-24T21:50:08.4545029-05:00
- **Duración:** 379,81 s (6 min 19 s) · `EXITCODE=0`
- Evidencias: `qa_evidencias/pytest_suite_20261124_214347.log`,
  `qa_evidencias/pytest_results_20261124_214347.xml`, `evidencias/TC-F-*.png`.
- El XML registra `tests=60 failures=0 errors=0 skipped=12 time=379.800 timestamp=2026-11-24T21:43:48.542819-05:00`.

### 2.2 Resultados

| Concepto | Valor |
|---|---|
| Diseñados | 60 |
| Ejecutados | 60 (100 %) |
| Aprobados | **48** |
| Fallidos | **0** |
| Omitidos | **12** |
| Avance de ejecución | 100 % |
| Corrección funcional (sobre ejecutados) | 100 % (48/48) |
| Tasa de defectos | 0 % |
| Cobertura útil (sobre diseñados) | 80 % (48/60) |

**Detalle técnico de fallos: no hay ninguno.** `failures=0` y `errors=0` en el XML; no existe
traceback, selector roto ni error HTTP que reportar. No se corrigió nada.

**Detalle exacto de los 12 omitidos** (motivo literal del XML):

| Test | Motivo |
|---|---|
| `test_login.py::test_bloqueo_tras_5_intentos` | Modifica datos reales. Activa con `RUN_DESTRUCTIVE=1` |
| `test_m01_registrar_venta.py::test_m01_feliz_venta_completa_descuenta_stock` | Modifica datos reales. Activa con `RUN_DESTRUCTIVE=1` |
| `test_m02_clientes.py::test_m02_feliz_registrar_cliente` | Modifica datos reales. Activa con `RUN_DESTRUCTIVE=1` |
| `test_m03_devoluciones.py::test_m03_feliz_devolucion_total` | Modifica datos reales. Activa con `RUN_DESTRUCTIVE=1` |
| `test_m04_productos.py::test_m04_feliz_crear_producto` | Modifica datos reales. Activa con `RUN_DESTRUCTIVE=1` |
| `test_m05_proveedores.py::test_m05_feliz_crear_proveedor` | Modifica datos reales. Activa con `RUN_DESTRUCTIVE=1` |
| `test_m06_ordenes_compra.py::test_m06_feliz_generar_orden` | Modifica datos reales. Activa con `RUN_DESTRUCTIVE=1` |
| `test_m08_usuarios.py::test_m08_feliz_crear_usuario` | Modifica datos reales. Activa con `RUN_DESTRUCTIVE=1` |
| `test_m09_registrar_entrada.py::test_m09_feliz_confirmar_entrada` | Modifica datos reales. Activa con `RUN_DESTRUCTIVE=1` |
| `test_tc10_autenticacion.py::test_tc_f_020_...` | Modifica datos reales. Activa con `RUN_DESTRUCTIVE=1` |
| `test_m09_registrar_entrada.py::test_m09_borde_cantidad_entre_1_y_lo_pedido` | No hay órdenes pendientes (genera una como Administrador) |
| `test_m09_registrar_entrada.py::test_m09_error_confirmar_sin_productos` | No hay órdenes pendientes (genera una como Administrador) |

Por decisión del usuario **no se ejecutaron los destructivos** (`RUN_DESTRUCTIVE=1`), para no
alterar datos reales en producción.

### 2.3 Pruebas unitarias del backend (ejecución real adicional)

`npm test` → `node --test test/*.test.js`: **26 tests, 26 pass, 0 fail, 0 skipped**, 2.678 s.
Cubren firma/expiración de JWT, CORS, RBAC 401/403, sanitización de contraseña, bloqueo por
5 intentos, precios desde token, traducción de errores `MN001`–`MN004`, timezone de Lima, etc.

---

## FASE 3 — Análisis estático (Mantenibilidad / SonarQube)

1. **No existía** `sonar-project.properties` en la raíz. **Se creó** con:
   `sonar.projectKey=miniso-web`, versión `2.0.0`, `sonar.sources=frontend/js,backend,api,paginas`,
   `sonar.tests=backend/test,tests`, exclusiones de `node_modules`, `venv`, `.venv`, `dist`,
   `build`, `coverage`, `.pytest_cache`, `evidencias`, `qa_evidencias`, `database`, logs, XML,
   PNG y CSV; UTF-8, Python 3.13 y rutas de cobertura `coverage/lcov.info` / `coverage.xml`.
2. **No hay contenedor de SonarQube**: Docker no está instalado ni hay imagen/servicio local.
   `sonar-scanner` tampoco está en PATH. No hay host ni token en el workspace.
3. Por instrucción explícita del usuario, **se omitió el escaneo real**.

### Métricas

**A. Ejecución externa de SonarCloud sobre el commit `33559261`, reportada por el usuario.**
Se transcribe literalmente; **no fue reproducida ni verificada en esta auditoría** y no se han
inventado cifras adicionales:

| Métrica | Valor reportado por el usuario |
|---|---|
| Líneas de código | 6,5 k |
| Duplicación | 0,3 % |
| Issues de mantenibilidad | 10 (Rating **A**) |
| Issues de fiabilidad | 26 (Rating **D**) |
| Issues de seguridad | 0 (Rating **A**) |
| Cobertura | No reportada |
| Complejidad ciclomática máxima | No reportada |

**B. Verificación local.** No hay contenedor, `sonar-scanner` ni credenciales; por decisión
del usuario **no se ejecutó escaneo local**. Por tanto las cifras de la tabla A son de origen
externo y las métricas locales quedan **no disponibles**. Para una ejecución futura se
necesitaría `sonar.host.url` + token (SonarQube) o `SONAR_TOKEN` + `sonar.organization`
(SonarCloud), y luego `npx sonar-scanner -Dsonar.login=<token>`. **No se han estimado cifras.**

---

## FASE 4 — Accesibilidad e inclusión (WCAG 2.1 AA / Ley N.° 29973)

### 4.1 Metodología real

- Se usaron las CLIs solicitadas sobre la pantalla pública de Login:
  `npx lighthouse 13.6.0` (HTML+JSON) y `npx @axe-core/cli 4.14.1` (JSON), con chrome/driver
  158. El driver incluido en axe CLI era 154 y falló; se solucionó pasando el chromedriver 158
  ya descargado por Selenium Manager (`--chromedriver-path`).
- Las pantallas internas guardan la sesión en **`sessionStorage`**, que no se puede inyectar
  desde esas CLIs. Se usó el **mismo motor** de forma programática (Lighthouse User Flows +
  axe-core 4.x vía Puppeteer) con un JWT real obtenido por `POST /api/login` y verificado
  visualmente en `qa_evidencias/screen_ventas.png` y `screen_inventario.png`.
  **Esto se reporta como desviación metodológica, no como resultado de CLI.**
- No existe `npm run dev`: la app auditada es el deploy en Vercel, que es el objetivo por
  defecto de los tests.

**Reportes generados en `qa_evidencias/`:** `lh_login.report.html/.json`, `axe_login.json`,
`lh_ventas_flow.json`, `axe_ventas.json`, `lh_inventario_flow.json`, `axe_inventario.json`,
`screen_ventas.png`, `screen_inventario.png`.

### 4.2 Violaciones detectadas por axe

| Pantalla | Regla | Impacto | WCAG | Componente afectado | Nodos |
|---|---|---|---|---|---|
| Login | `color-contrast` | Serio | 1.4.3 (wcag2aa, wcag143) | `.login-subtitle` y la fila de texto del login (`div:nth-child(5)`); 2,67:1 vs 4,5:1 requerido | 2 |
| Ventas | `button-name` | **Crítico** | 4.1.2 (wcag2a, wcag412) | Botones `+` de la tabla de productos (`addToCart('P001')` … `P005`): sin texto accesible, `aria-label` ni `aria-labelledby` | 5 |
| Ventas | `color-contrast` | Serio | 1.4.3 (wcag2aa, wcag143) | `.topbar-actions > span`, `.page-subtitle`, `.badge`, `td[colspan="5"]` (2,52–2,73:1) | 4 |
| Inventario | `color-contrast` | Serio | 1.4.3 (wcag2aa, wcag143) | `span`, `.page-subtitle`, `.stat-label` de las 3 tarjetas (2,52–2,67:1) | 5 |

Totales: **1 regla crítica por pantalla (5 nodos)** y **3 reglas serias por pantalla (11 nodos;
`color-contrast` aparece en las 3 pantallas)**. No se corrigió nada.

### 4.3 Puntajes Lighthouse

| Pantalla | Accesibilidad | Performance |
|---|---|---|
| Login (CLI) | **87** | **99** |
| Registrar Venta (Cajero) — antes | **77** | **99** |
| Registrar Venta (Cajero) — después (preview local, §4.5) | **92** | **97** |
| Reporte de Inventario (Administrador) | **87** | **99** |

Audits de accesibilidad fallidos en Lighthouse: Login → `color-contrast`, `landmark-one-main`;
Ventas (antes) → `button-name`, `color-contrast`, `landmark-one-main`, `td-has-header`; Ventas
(deshpués) → `color-contrast`, `landmark-one-main`, `td-has-header`; Inventario →
`color-contrast`, `landmark-one-main`. El descenso de Performance 99 → 97 es variación de la
medición local; no se hizo ningún cambio de rendimiento.

### 4.4 Checklist de revisión manual con teclado (WCAG 2.1 AA / Ley 29973)

| # | Elemento / acción | Qué verificar |
|---|---|---|
| 1 | Carga de Login → `Tab` | Orden lógico usuario → contraseña → "Ingresar"; foco visible en cada campo |
| 2 | `Enter` en el formulario | Envía sin ratón; mensaje de error anunciado (no solo visual) |
| 3 | `Tab` tras iniciar sesión | Primer foco debe estar en el menú lateral, no perderse en `#app` |
| 4 | Menú `.sidebar-nav a.nav-item` | Cada ítem se alcanza con `Tab` y se activa con `Enter`; indicador de foco visible sobre fondo oscuro |
| 5 | `Shift+Tab` desde el final | El foco puede salir de la barra lateral y volver al inicio sin quedar atrapado |
| 6 | Ventas: botones `+` (`addToCart`) | **Crítico resuelto en preview local (§4.5)**: antes sin nombre accesible, ahora con `aria-label="Agregar <producto> a la venta"`. Confirmar con lector de pantalla y tras publicar en Vercel |
| 7 | Buscador de productos / clientes | `Tab` alcanza el input; resultados se pueden recorrer y elegir con `Enter` |
| 8 | "Confirmar Venta" | `Tab` + `Enter` funciona; el toast de comprobante se anuncia (`role="status"` / `aria-live`) |
| 9 | Modales (Devoluciones, Nuevo Producto, etc.) | `Esc` cierra; el foco entra al abrir, se mantiene dentro (`focus trap`) y vuelve al disparador al cerrar |
| 10 | Tablas de inventario/reportes | Encabezados asociados a celdas (`th`/`scope`) — Lighthouse marca `td-has-header` en Ventas |
| 11 | Exportar CSV / botones ghost | `Tab` + `Enter` y foco visible; sin dependencia de hover |
| 12 | `Esc` tras logout / `Alt+Izquierda` | No se restaura contenido interno (ya cubierto por TC-F-006, pero verificar con lector) |
| 13 | Zoom al 200 % y 400 % | Sin pérdida de contenido ni desbordamiento horizontal (1.4.10 Reflow) |
| 14 | Contraste con foco | Verificar que el indicador de foco supera 3:1 sobre los fondos `#9e9e9e`/`#f8f8f8` señalados por axe |

Tomar captura de pantalla del foco visible en los puntos 4, 6 y 9 como evidencia de la revisión manual.

### 4.5 Remediación autorizada de la violación crítica (antes vs. después)

**Único cambio en código de aplicación** (expresamente autorizado). `frontend/js/pages.js`
estaba limpio antes de esta auditoría; se modificó **una sola línea** en `productoRowsVenta`:

```diff
- <td><button class="btn btn-sm btn-outline" ${p.stock === 0 ? 'disabled' : ''} onclick="addToCart('${p.id}')">${ICONS.plus}</button></td>
+ <td><button class="btn btn-sm btn-outline" ${p.stock === 0 ? 'disabled' : ''} onclick="addToCart('${p.id}')" aria-label="Agregar ${esc(p.nombre)} a la venta">${ICONS.plus}</button></td>
```

Se reutiliza `esc()` (ya existente en `app.js`) para escapar el nombre dentro del atributo.
No se tocó lógica de negocio, ni tests, ni los cambios preexistentes del working tree.

**Método del "después":** el deploy de Vercel (entorno oficial) no se puede actualizar desde
este workspace, por lo que se sirvió el `frontend/` modificado en `http://127.0.0.1:5500/`
apuntando a la **misma API desplegada**, con la misma sesión JWT real de `cajero01`, el mismo
viewport (1400×900) y los mismos tags de axe / motor de Lighthouse. En consecuencia, el
"después" es una **previsualización local**, no una medición del deploy.

| Métrica (Ventas) | Antes (deploy) | Después (preview local) |
|---|---|---|
| axe `button-name` (crítico) | 1 regla, 5 nodos | **0 reglas, 0 nodos** |
| axe `color-contrast` (serio) | 1 regla, 4 nodos | 1 regla, 4 nodos (**sin tocar**) |
| Total reglas axe | 2 | **1** |
| Lighthouse Accesibilidad | 77 | **92** |
| Lighthouse Performance | 99 | 97 (variación; no se optimizó rendimiento) |

`aria-label` reales leídos del DOM tras el cambio: "Agregar Taza Cerámica a la venta",
"Agregar Bolsa de Tela a la venta", "Agregar Set Papelería a la venta",
"Agregar Cojín Decorativo a la venta", "Agregar Lámpara LED a la venta".

Evidencia: `qa_evidencias/axe_ventas_despues.json`, `qa_evidencias/lh_ventas_flow_despues.json`
y `qa_evidencias/screen_ventas_despues.png`.

---

## Conclusiones por característica ISO/IEC 25010:2023

- **Adecuación funcional:** 48/48 ejecutados correctos; 12 casos sin ejecutar impiden afirmar
  cobertura total. Los flujos RBAC (401/403) y expiración de sesión sí fueron validados en vivo.
- **Confiabilidad:** 0 fallos en 48 ejecuciones + 26/26 unitarios; sin evidencia de inestabilidad
  en esta corrida (no se evaluó tolerancia a fallos ni recuperación prolongada).
- **Mantenibilidad:** con datos **externos no reproducidos aquí** (SonarCloud del usuario sobre
  el commit evaluado): 10 issues de mantenibilidad (A), 26 de fiabilidad (D), 0 de seguridad
  (A), 0,3 % de duplicación y 6,5 k LOC. Cobertura y complejidad máxima no fueron reportadas.
- **Capacidad de interacción:** el defecto crítico `button-name` (WCAG 4.1.2) quedó resuelto en
  la previsualización local (5 → 0 nodos; accesibilidad 77 → 92). Persisten como **barreras
  pendientes** el contraste insuficiente (1.4.3), `landmark-one-main` y `td-has-header`, y la
  revisión manual con teclado del §4.4. El "después" aún debe medirse sobre el deploy.

---

## Decisiones registradas (respuestas del usuario)

1. **Casos destructivos:** no ejecutados. Se conservan las 48 ejecuciones reales (0 fallidas) y
   las 12 omisiones quedan documentadas como salvaguarda de integridad en producción y
   precondición de estado. No se alteró código de pruebas.
2. **SonarQube / SonarCloud:** sin escaneo local. Se incorporan las métricas provistas por el
   usuario, identificadas como ejecución externa no reproducida en esta auditoría.
3. **Remediación:** corregido únicamente `button-name` (WCAG 4.1.2) en los 5 botones de Ventas.
   `color-contrast` (1.4.3) se deja intacto y se documenta como barrera pendiente.
4. **Entorno:** el deploy de Vercel es el entorno oficial evaluado. El "después" se midió en
   previsualización local porque el deploy no se puede actualizar desde este workspace.
5. **Versión:** se usa **2.0.0** en el informe; `V1.01` del README se reporta como hallazgo
   menor de gestión de configuración.
6. **Kiwi TCMS:** CSV entregado para importación manual; Docker no fue levantado.

**Pendiente para cerrar la Evaluación Final:** publicar el cambio de `pages.js` en Vercel y
repetir axe/Lighthouse sobre la URL oficial para que el "después" también sea evidencia del
entorno evaluado; ejecutar la revisión manual con teclado del §4.4; decidir si se abordan las
barreras de contraste pendientes.
