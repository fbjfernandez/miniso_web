"""api_auth.py — utilidades de autenticación JWT para las pruebas de API.

La API v2 ya no acepta el header ``x-user-role``: hay que iniciar sesión en
``POST /login`` y enviar el token como ``Authorization: Bearer <token>``.

La URL base se toma de ``MINISO_API_URL`` (por ejemplo
``http://localhost:3000/api``) o, si no está definida, de ``MINISO_URL``
(por defecto el deploy de Vercel) agregando ``/api``.
"""
import os
import time
from pathlib import Path

import requests

DEPLOY_URL = "https://miniso-web-omega.vercel.app"
CLAVE = os.getenv("MINISO_CLAVE", "1234")


def _api_base():
    explicita = os.getenv("MINISO_API_URL")
    if explicita:
        return explicita.rstrip("/")
    frontend = (os.getenv("MINISO_URL") or DEPLOY_URL).rstrip("/")
    if frontend.endswith("/api"):
        return frontend
    return frontend + "/api"


API_URL = _api_base()


def login(username, password=CLAVE, timeout=60):
    """POST /login con el formato real de la API: ``{username, password}``."""
    return requests.post(
        f"{API_URL}/login",
        json={"username": username, "password": password},
        timeout=timeout,
    )


def token(username, password=CLAVE, timeout=60):
    """Devuelve el JWT de un login correcto; falla con el motivo del servidor."""
    r = login(username, password, timeout=timeout)
    if r.status_code != 200:
        raise AssertionError(
            f"No se pudo iniciar sesión como {username}: "
            f"HTTP {r.status_code} — {r.text[:300]}"
        )
    return r.json()["data"]["token"]


def headers(jwt):
    return {"Authorization": f"Bearer {jwt}"}


def desbloquear(username, admin_user="admin01", admin_pass=None, timeout=60):
    """Desbloquea y reinicia el contador de intentos de una cuenta demo.

    Requiere un administrador activo. Es *best effort*: devuelve False si el
    admin no puede iniciar sesión (por ejemplo, si su propia cuenta está
    bloqueada) en lugar de romper la prueba que lo invoca.
    """
    try:
        jwt_admin = token(admin_user, admin_pass or CLAVE, timeout=timeout)
        r = requests.get(
            f"{API_URL}/usuarios", headers=headers(jwt_admin), timeout=timeout
        )
        if r.status_code != 200:
            return False
        usuario = next(
            (u for u in (r.json().get("data") or []) if u.get("username") == username),
            None,
        )
        if not usuario:
            return False
        r = requests.put(
            f"{API_URL}/usuarios/{usuario['id']}",
            headers=headers(jwt_admin),
            json={"bloqueado": False},
            timeout=timeout,
        )
        return r.status_code == 200
    except (requests.RequestException, KeyError, AssertionError):
        return False


def desbloquear_cuentas_demo():
    """Desbloquea las cuentas demo para no arrastrar bloqueos entre pruebas."""
    return {u: desbloquear(u) for u in ("cajero01", "almacen01", "admin01")}


# ---------------------------------------------------------------------------
# Limpieza / rollback para las pruebas destructivas
# ---------------------------------------------------------------------------
# Las pruebas destructivas crean clientes, productos, proveedores, usuarios,
# ventas, devoluciones, órdenes y entradas. La API no expone DELETE, así que
# para dejar el entorno exactamente como estaba se usa la REST API de Supabase
# con la service_role que ya vive en backend/.env (fichero gitignored).

def _env_backend():
    """Lee backend/.env sin depender del directorio desde el que se lanza pytest."""
    ruta = Path(__file__).resolve().parents[1] / "backend" / ".env"
    datos = {}
    if not ruta.exists():
        return datos
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, valor = linea.split("=", 1)
        datos[clave.strip()] = valor.strip().strip('"').strip("'")
    return datos


def _supabase_config():
    datos = _env_backend()
    url = os.getenv("SUPABASE_URL") or datos.get("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY") or datos.get("SUPABASE_KEY")
    if not url or not key:
        raise AssertionError(
            "Faltan SUPABASE_URL/SUPABASE_KEY para limpiar los datos de prueba "
            "(defínelos en el entorno o en backend/.env)"
        )
    return url.rstrip("/"), key


def _sb(method, tabla, params=None, payload=None, timeout=60):
    """Llama a la REST API de Supabase. No imprime la service_role."""
    url, key = _supabase_config()
    cabeceras = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if method in ("POST", "PATCH"):
        cabeceras["Prefer"] = "return=representation"
    r = requests.request(
        method,
        f"{url}/rest/v1/{tabla}",
        headers=cabeceras,
        params=params,
        json=payload,
        timeout=timeout,
    )
    if not r.ok:
        raise AssertionError(
            f"Supabase {method} {tabla} -> HTTP {r.status_code}: {r.text[:300]}"
        )
    if not r.content:
        return None
    try:
        return r.json()
    except ValueError:
        return None


def sb_select(tabla, **params):
    params.setdefault("select", "*")
    return _sb("GET", tabla, params=params) or []


def sb_update(tabla, valores, **filtros):
    return _sb("PATCH", tabla, params=filtros, payload=valores)


def sb_delete(tabla, **filtros):
    return _sb("DELETE", tabla, params=filtros)


def api_request(method, ruta, username="admin01", payload=None, timeout=60):
    """Petición autenticada a la API desplegada."""
    jwt = token(username, timeout=timeout)
    return requests.request(
        method,
        f"{API_URL}{ruta}",
        headers={**headers(jwt), "Content-Type": "application/json"},
        json=payload,
        timeout=timeout,
    )


def id_por(campo, valor, tabla, select="id"):
    filas = sb_select(tabla, select=select, **{campo: f"eq.{valor}"})
    return filas[0]["id"] if filas else None


# ---- usuarios -------------------------------------------------------------

def crear_usuario_desechable(prefijo="qa_bloqueo", rol="Cajero"):
    """Crea una cuenta temporal para probar el bloqueo sin tocar las demos."""
    for _ in range(5):
        username = f"{prefijo}_{time.time_ns() % 1_000_000_000:09d}"
        r = api_request(
            "POST",
            "/usuarios",
            "admin01",
            {
                "nombre": "QA",
                "apellido_paterno": "Bloqueo",
                "username": username,
                "password": CLAVE,
                "rol": rol,
            },
        )
        if r.status_code == 201:
            return username
        if r.status_code != 409:  # 409 = username repetido; reintenta
            raise AssertionError(
                f"No se pudo crear la cuenta desechable: HTTP {r.status_code} — {r.text[:300]}"
            )
    raise AssertionError("No se pudo generar un username desechable único")


def eliminar_usuario(username):
    """Elimina la cuenta temporal; si tiene referencias, la desactiva."""
    try:
        sb_delete("usuario", username=f"eq.{username}")
    except AssertionError:
        sb_update(
            "usuario",
            {"activo": False, "bloqueado": False, "intentos_fallidos": 0},
            username=f"eq.{username}",
        )


def snapshot_usuario(username):
    filas = sb_select(
        "usuario",
        username=f"eq.{username}",
        select="username,rol,activo,bloqueado,intentos_fallidos",
    )
    return filas[0] if filas else None


def restaurar_usuario(username, snap):
    if not snap:
        return
    sb_update(
        "usuario",
        {
            "rol": snap["rol"],
            "activo": snap["activo"],
            "bloqueado": snap["bloqueado"],
            "intentos_fallidos": snap["intentos_fallidos"],
        },
        username=f"eq.{username}",
    )


# ---- stock / puntos / comprobantes ---------------------------------------

def snapshot_stocks():
    return {p["id"]: p["stock"] for p in sb_select("producto", select="id,stock")}


def restaurar_stocks(snap):
    actuales = snapshot_stocks()
    for id_producto, stock in snap.items():
        if actuales.get(id_producto) != stock:
            sb_update("producto", {"stock": stock}, id=f"eq.{id_producto}")


def restaurar_stock(id_producto, stock):
    if id_producto and stock is not None:
        sb_update("producto", {"stock": stock}, id=f"eq.{id_producto}")


def snapshot_puntos():
    return {c["id"]: c["puntos"] for c in sb_select("cliente", select="id,puntos")}


def restaurar_puntos(snap):
    actuales = snapshot_puntos()
    for id_cliente, puntos in snap.items():
        if actuales.get(id_cliente) != puntos:
            sb_update("cliente", {"puntos": puntos}, id=f"eq.{id_cliente}")


def restaurar_puntos_cliente(id_cliente, puntos):
    if id_cliente and puntos is not None:
        sb_update("cliente", {"puntos": puntos}, id=f"eq.{id_cliente}")


def snapshot_control(serie="B001"):
    filas = sb_select("control_comprobante", serie=f"eq.{serie}", select="ultimo")
    return filas[0]["ultimo"] if filas else None


def restaurar_control(ultimo, serie="B001"):
    if ultimo is not None:
        sb_update("control_comprobante", {"ultimo": ultimo}, serie=f"eq.{serie}")


def ids_ventas():
    return {v["id"] for v in sb_select("venta", select="id")}


def ids_ordenes():
    return {o["id"] for o in sb_select("orden_compra", select="id")}


# ---- borrado de registros creados por las pruebas ------------------------

def eliminar_venta(id_venta):
    """Borra la venta y sus dependencias; el trigger repone el stock pendiente."""
    sb_delete("devolucion", id_venta=f"eq.{id_venta}")
    sb_delete("nota_salida", id_venta=f"eq.{id_venta}")
    sb_delete("detalle_venta", id_venta=f"eq.{id_venta}")
    sb_delete("venta", id=f"eq.{id_venta}")


def eliminar_entrada(id_entrada):
    """Borra el detalle (revierte stock) y la cabecera de la entrada."""
    sb_delete("detalle_entrada", id_entrada=f"eq.{id_entrada}")
    sb_delete("entrada_inventario", id=f"eq.{id_entrada}")


def eliminar_orden(id_orden):
    """Borra la orden; si ya fue recibida, borra antes su entrada y revierte stock."""
    for entrada in sb_select("entrada_inventario", id_orden=f"eq.{id_orden}", select="id"):
        eliminar_entrada(entrada["id"])
    sb_delete("detalle_orden_compra", id_orden=f"eq.{id_orden}")
    sb_delete("orden_compra", id=f"eq.{id_orden}")


def eliminar_cliente(id_cliente):
    sb_delete("cliente", id=f"eq.{id_cliente}")


def eliminar_producto(id_producto):
    try:
        sb_delete("producto", id=f"eq.{id_producto}")
    except AssertionError:
        # Si ya tiene ventas/órdenes asociadas, al menos que no aparezca en el catálogo.
        sb_update("producto", {"activo": False, "stock": 0}, id=f"eq.{id_producto}")


def eliminar_proveedor(id_proveedor):
    try:
        sb_delete("proveedor", id=f"eq.{id_proveedor}")
    except AssertionError:
        sb_update("proveedor", {"activo": False}, id=f"eq.{id_proveedor}")


# ---- escenarios temporales ------------------------------------------------

def crear_venta_prueba(username="cajero01", cantidad=1):
    """Crea una venta real y devuelve todo lo necesario para revertirla."""
    productos = sb_select(
        "producto",
        select="id,nombre,stock",
        activo="eq.true",
        stock="gt.0",
        order="id",
        limit="1",
    )
    if not productos:
        raise AssertionError("No hay productos con stock para preparar la venta de prueba")
    producto = productos[0]

    clientes = sb_select("cliente", select="id,nombre,puntos", order="id", limit="1")
    cliente_creado = False
    if clientes:
        cliente = clientes[0]
    else:
        dni = str(time.time_ns())[-8:]
        r = api_request(
            "POST",
            "/clientes",
            "cajero01",
            {
                "nombre": f"QA Cliente temporal {dni}",
                "dni": dni,
                "telefono": "999888777",
                "email": f"qa{dni}@test.com",
            },
        )
        if r.status_code != 201:
            raise AssertionError(f"No se pudo crear el cliente temporal: {r.text[:300]}")
        cliente = r.json()["data"]
        cliente_creado = True

    control_antes = snapshot_control()
    r = api_request(
        "POST",
        "/ventas",
        username,
        {
            "id_cliente": cliente["id"],
            "items": [{"id_producto": producto["id"], "cantidad": cantidad}],
        },
    )
    if r.status_code != 201:
        raise AssertionError(f"No se pudo crear la venta de prueba: {r.text[:300]}")

    return {
        "venta": r.json()["data"],
        "id_producto": producto["id"],
        "stock_antes": producto["stock"],
        "id_cliente": cliente["id"],
        "puntos_antes": cliente.get("puntos", 0),
        "control_antes": control_antes,
        "cliente_creado": cliente_creado,
    }


def limpiar_venta_prueba(ctx):
    if not ctx:
        return
    if ctx.get("venta"):
        eliminar_venta(ctx["venta"]["id"])
    restaurar_stock(ctx.get("id_producto"), ctx.get("stock_antes"))
    restaurar_puntos_cliente(ctx.get("id_cliente"), ctx.get("puntos_antes"))
    restaurar_control(ctx.get("control_antes"))
    if ctx.get("cliente_creado"):
        eliminar_cliente(ctx["id_cliente"])


def crear_orden_prueba(cantidad=2):
    """Crea una orden pendiente para probar la recepción de almacén."""
    productos = sb_select(
        "producto",
        select="id,nombre,stock,costo",
        activo="eq.true",
        order="id",
        limit="1",
    )
    proveedores = sb_select(
        "proveedor", select="id,nombre", activo="eq.true", order="id", limit="1"
    )
    if not productos or not proveedores:
        raise AssertionError("No hay producto/proveedor activo para preparar la orden")
    producto, proveedor = productos[0], proveedores[0]
    costo = producto.get("costo")
    if costo is None:
        costo = 1

    r = api_request(
        "POST",
        "/ordenes-compra",
        "admin01",
        {
            "id_proveedor": proveedor["id"],
            "items": [
                {
                    "id_producto": producto["id"],
                    "cantidad": cantidad,
                    "costo_unit": costo,
                }
            ],
        },
    )
    if r.status_code != 201:
        raise AssertionError(f"No se pudo crear la orden de prueba: {r.text[:300]}")

    return {
        "id_orden": r.json()["data"]["id"],
        "id_producto": producto["id"],
        "stock_antes": producto["stock"],
        "cantidad": cantidad,
    }


def limpiar_orden_prueba(ctx):
    if not ctx:
        return
    eliminar_orden(ctx.get("id_orden"))
    restaurar_stock(ctx.get("id_producto"), ctx.get("stock_antes"))
