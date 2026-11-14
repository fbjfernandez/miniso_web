import pytest
from conftest import URL

MENUS = {
    "Cajero": {
        "ven": ["Dashboard", "Registrar Venta", "Clientes", "Devoluciones"],
        "no_ven": ["Productos", "Proveedores", "Usuarios", "Registrar Entrada"],
    },
    "Administrador": {
        "ven": ["Dashboard", "Productos", "Proveedores", "Órdenes de Compra", "Reporte de Ventas", "Usuarios"],
        "no_ven": ["Registrar Venta", "Registrar Entrada"],
    },
    "Almacenero": {
        "ven": ["Dashboard", "Registrar Entrada", "Productos Agotados", "Reporte de Inventario"],
        "no_ven": ["Registrar Venta", "Usuarios", "Reporte de Ventas"],
    },
}


@pytest.mark.parametrize("rol", MENUS)
def test_menu_segun_rol(entrar, rol):
    menu = entrar(rol).menu()
    for item in MENUS[rol]["ven"]:
        assert item in menu, f"{rol} debería ver '{item}'"
    for item in MENUS[rol]["no_ven"]:
        assert item not in menu, f"{rol} NO debería ver '{item}'"


def test_api_devuelve_403_al_cajero_en_usuarios(driver, entrar):
    """Aunque el menú oculte la opción, el backend debe rechazar al cajero."""
    entrar("Cajero")
    estado = driver.execute_async_script("""
        const hecho = arguments[arguments.length - 1];
        fetch(API_URL + '/usuarios', {headers: {Authorization: 'Bearer ' + APP.currentUser.token}})
          .then(r => hecho(r.status));
    """)
    assert estado == 403
