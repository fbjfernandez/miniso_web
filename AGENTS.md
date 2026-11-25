# AGENTS.md

## Layout & entrypoints
- Root `package.json` holds the shared dependencies Vercel installs for the Serverless Function; `backend/` remains the local backend root.
- Backend: `backend/server.js` composes `backend/app.js` and exports the Express app; `backend/app.js` mounts `backend/routes/api.js` at `/api`; `dao/` and `service/` go through `backend/config/supabase.js`.
- Serverless entry: root `api/index.js` re-exports `backend/server.js`; `vercel.json` serves `frontend/` and routes `/api/*` to that function.
- **Do not edit `backend/api.js`** — it is an old duplicate router with no RBAC and is never required. Live routes and `autorizarRoles` are only in `backend/routes/api.js`.
- Frontend is static, no build/bundler: `frontend/index.html` loads `js/api.js`, `js/app.js`, `js/pages.js` in that order as classic scripts. State/routing/nav live in `app.js`; the `render*` functions it calls live in `pages.js`.
- Python side: `tests/` (Selenium E2E), `paginas/` (Page Object helper).

## Run locally
- Backend: `cd backend && npm ci`, then put `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET` (mínimo 16 caracteres), `ALLOWED_ORIGINS` (opcional, separado por comas) and `PORT` (default 3000) in `backend/.env` (gitignored). dotenv reads the cwd, so start from `backend/`.
- `npm start` runs `node server.js`; it listens on `PORT` only when `NODE_ENV !== 'production'`.
- Serve `frontend/` on port **5500** (e.g. Live Server). Backend CORS allows only `localhost:5500`, `127.0.0.1:5500`, and the deployed Vercel origin.
- `frontend/js/api.js` uses `window.MINISO_API_URL || '/api'` — for local runs set `window.MINISO_API_URL = 'http://localhost:3000/api'` before loading it. Every endpoint answers `{ ok, data, ... }`; `request()` throws when `ok` is false.

## Tests / verification
- No lint, typecheck, or CI config exists. Backend verification is `npm test` from the repo root (delegates to `backend/`); end-to-end verification is `pytest` from the repo root (`pytest.ini`: `testpaths=tests`, `python_files=test_*.py`) plus manual checks.
- Backend unit tests: `npm test` from the repo root (runs `node --test test/*.test.js` in `backend/`); latest run: 26/26 passed.
- E2E suite: `venv\Scripts\python.exe -m pytest -v -ra --junitxml=qa_evidencias/pytest_results_20261124_214347.xml` from the repo root with `HEADLESS=1`; latest run: 60 collected, 48 passed, 12 skipped, 0 failed. Destructive cases require `RUN_DESTRUCTIVE=1` and are skipped otherwise to protect production data.
- Tests are Selenium E2E against the live deploy `https://miniso-web-omega.vercel.app`, not a local server. Need Chrome + `selenium` + `requests` (Selenium 4.6+ fetches the driver). Serverless cold starts can take ~30 s; the 45 s waits are deliberate.
- Run pytest from the repo root: `tests/conftest.py` writes `evidencias/TC-F-XXX_evidencia_01.png` and appends `resultados_tc10.csv` for tests named `test_tc_f_XXX_*` (relative paths).
- `tests/test_tc10_autenticacion.py` defaults `BASE_URL`/`API_URL` to the deployed Vercel app and can be overridden with `MINISO_URL` / `MINISO_API_URL` (`.../api`); its selectors now match `frontend/js/pages.js` and `frontend/js/app.js`. Password can be overridden with `MINISO_CLAVE`. `tests/api_auth.py` centralizes JWT login, `Authorization: Bearer` headers and best-effort account unlocking.
- `test_flujo_principal.py` defines its own `driver` fixture that shadows conftest's and writes `TC8_Evidencia.png` at the repo root. `tests/inspeccionar.py` is a manual selector-dump script, not collected by pytest.

## Project status (2026-11-25)
- Declared version is **2.0.0** (root and `backend/package.json`); the backend is deployed as a Vercel Serverless Function. The README still says `V1.01` (known documentation mismatch).
- QA artifacts: `qa_audit_report.md`, `sonar-project.properties` and `qa_evidencias/` (JUnit XML, logs, axe/Lighthouse JSON and screenshots). The 60 cases are catalogued in Kiwi TCMS Test Plan **16827** with status CONFIRMED and reported in Test Run **16105** (48 PASSED / 12 WAIVED).
- Secrets are never committed: use `backend/.env`, `qa_evidencias/.kiwi.env` and `~/.tcms.conf`; all are gitignored.

## Accessibility conventions
- Icon-only controls need an accessible name: add a descriptive `aria-label` (for example `aria-label="Agregar ${esc(p.nombre)} a la venta"` in `productoRowsVenta`, `frontend/js/pages.js`) and escape dynamic text with `esc()`.
- Keep visible keyboard focus, WCAG 1.4.3 contrast of at least 4.5:1 for normal text, `th`/`scope` on data tables, and `Esc` plus focus management in modals. Known pending barriers: `color-contrast`, `landmark-one-main` and `td-has-header` (see `qa_audit_report.md` §4).

## Domain quirks that change how you work
- Auth is JWT-based: `POST /api/login` returns the user plus a signed `token` (`{ ok, data: { ..., token } }`); the frontend stores the user in `sessionStorage` (`miniso_sesion`) and `frontend/js/api.js` sends `Authorization: Bearer <token>` on every request. `autorizarRoles` verifies the signature: missing/invalid token → 401, role not allowed → 403. Roles are `Administrador`, `Almacenero`, `Cajero`. The old `x-user-role` header is ignored and no longer authenticates.
- DB is external Supabase PostgreSQL with no migrations or SQL files in this repo. Sales call RPC `registrar_venta`; reports read views `v_reporte_ventas` and `v_reporte_inventario` (README also mentions `pgcrypto`). Schema work must happen in Supabase.
- Demo accounts: `admin01`, `almacen01`, `cajero01` / `1234`; 5 failed logins lock an account.
