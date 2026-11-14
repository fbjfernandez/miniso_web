from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from paginas.login_page import LoginPage
from conftest import URL


def _abrir(entrar):
    app = entrar("Almacenero")
    app.ir_a("Productos Agotados")
    app.hay_texto("Productos que han llegado o están por debajo del stock mínimo")
    return app


def test_m10_feliz_lista_solo_productos_en_o_bajo_el_minimo(entrar):
    app = _abrir(entrar)
    filas = app.filas("table tbody tr")
    if len(filas[0]) == 1:                                        # fila "No hay productos agotados"
        assert not app.existe(".alert-warning")
        return
    assert f"Hay {len(filas)} producto(s)" in app.texto_de(".alert-warning")
    for f in filas:                                               # [cod, nombre, cat, stock, minimo, proveedor]
        assert int(f[3]) <= int(f[4]), f"{f[1]} no debería estar en la lista"


def test_m10_borde_sin_productos_muestra_mensaje_vacio(entrar):
    app = _abrir(entrar)
    app.js("DB.productos = []; renderProductosAgotados();")
    app.hay_texto("No hay productos agotados")
    assert not app.existe(".alert-warning")


def test_m10_error_token_vencido_cierra_sesion(driver, entrar):
    app = _abrir(entrar)
    app.js("const s = JSON.parse(sessionStorage.getItem('miniso_sesion'));"
           "s.user.token = 'token-invalido';"
           "sessionStorage.setItem('miniso_sesion', JSON.stringify(s));")
    driver.refresh()
    assert "sesión expiró" in app.toast("Tu sesión expiró")
    LoginPage(driver, URL).espera.until(EC.visibility_of_element_located(LoginPage.TXT_USUARIO))
