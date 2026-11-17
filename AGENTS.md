# AGENTS.md

## Layout & entrypoints
- Root `package.json` holds the shared dependencies Vercel installs for the Serverless Function; `backend/` remains the local backend root.
- Backend: `backend/server.js` composes `backend/app.js` and exports the Express app; `backend/app.js` mounts `backend/routes/api.js` at `/api`; `dao/` and `service/` go through `backend/config/supabase.js`.
- Serverless entry: root `api/index.js` re-exports `backend/server.js`; `vercel.json` serves `frontend/` and routes `/api/*` to that function.
- **Do not edit `backend/api.js`** — it is an old duplicate router with no RBAC and is never required. Live routes and `autorizarRoles` are only in `backend/routes/api.js`.
- Frontend is static, no build/bundler: `frontend/index.html` loads `js/api.js`, `js/app.js`, `js/pages.js` in that order as classic scripts. State/routing/nav live in `app.js`; the `render*` functions it calls live in `pages.js`.
- Python side: `tests/` (Selenium E2E), `paginas/` (Page Object helper).

## Run locally
- Backend: `cd backend && npm ci`, then put `SUPABASE_URL`, `SUPABASE_KEY`, `PORT` (default 3000) in `backend/.env` (gitignored). dotenv reads the cwd, so start from `backend/`.
- `npm start` runs `node server.js`; it listens on `PORT` only when `NODE_ENV !== 'production'`.
- Serve `frontend/` on port **5500** (e.g. Live Server). Backend CORS allows only `localhost:5500`, `127.0.0.1:5500`, and the deployed Vercel origin.
- `frontend/js/api.js` uses `window.MINISO_API_URL || '/api'` — for local runs set `window.MINISO_API_URL = 'http://localhost:3000/api'` before loading it. Every endpoint answers `{ ok, data, ... }`; `request()` throws when `ok` is false.

## Tests / verification
- No lint, typecheck, or CI config exists. Backend verification is `npm test` from the repo root (delegates to `backend/`); end-to-end verification is `pytest` from the repo root (`pytest.ini`: `testpaths=tests`, `python_files=test_*.py`) plus manual checks.
- Tests are Selenium E2E against the live deploy `https://miniso-web-omega.vercel.app`, not a local server. Need Chrome + `selenium` + `requests` (Selenium 4.6+ fetches the driver). Serverless cold starts can take ~30 s; the 45 s waits are deliberate.
- Run pytest from the repo root: `tests/conftest.py` writes `evidencias/TC-F-XXX_evidencia_01.png` and appends `resultados_tc10.csv` for tests named `test_tc_f_XXX_*` (relative paths).
- `tests/test_tc10_autenticacion.py` defaults `API_URL` to the deployed Vercel app and can be overridden with `MINISO_API_URL`; the selectors marked `# AJUSTAR` must be confirmed before running RBAC/API cases. Password can be overridden with `MINISO_CLAVE`.
- `test_flujo_principal.py` defines its own `driver` fixture that shadows conftest's and writes `TC8_Evidencia.png` at the repo root. `tests/inspeccionar.py` is a manual selector-dump script, not collected by pytest.

## Domain quirks that change how you work
- No token/session auth: login returns the user including `rol`; the frontend stores it as `miniso-current-user` (local + sessionStorage) and sends it as the `x-user-role` header. `autorizarRoles` trusts that header: missing → 401, wrong role → 403. Roles are `Administrador`, `Almacenero`, `Cajero`.
- DB is external Supabase PostgreSQL with no migrations or SQL files in this repo. Sales call RPC `registrar_venta`; reports read views `v_reporte_ventas` and `v_reporte_inventario` (README also mentions `pgcrypto`). Schema work must happen in Supabase.
- Demo accounts: `admin01`, `almacen01`, `cajero01` / `1234`; 5 failed logins lock an account.
