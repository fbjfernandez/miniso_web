from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from paginas.app_page import soles


def _abrir(entrar):
    app = entrar("Almacenero")
    app.ir_a("Reporte de Inventario")
    app.hay_texto("Valorización y estado actual del inventario")
    return app


def _stat(app, etiqueta):
    xp = f"//div[@class='stat-label'][contains(., '{etiqueta}')]/preceding-sibling::div[@class='stat-value']"
    return app.espera.until(EC.visibility_of_element_located((By.XPATH, xp))).text


def test_m11_feliz_valor_total_coincide_con_la_tabla(entrar):
    app = _abrir(entrar)
    filas = app.filas(".table-wrapper tbody tr")                  # [cod, nombre, cat, stock, precio, valor]
    suma = sum(soles(f[5]) for f in filas)
    assert abs(soles(_stat(app, "Valor total del inventario")) - suma) <= 0.01 * len(filas) + 0.01
    assert int(_stat(app, "Productos en catálogo")) == len(filas)


def test_m11_borde_catalogo_vacio_muestra_ceros(entrar):
    app = _abrir(entrar)
    app.js("DB.productos = []; renderReporteInventario();")
    assert _stat(app, "Valor total del inventario") == "S/ 0.00"
    assert _stat(app, "Productos en catálogo") == "0"


def test_m11_error_exportar_con_catalogo_vacio(entrar):
    app = _abrir(entrar)
    app.js("DB.productos = []; renderReporteInventario();")
    app.clic_boton("Exportar CSV")
    assert "No hay productos para exportar" in app.toast("No hay productos para exportar")
