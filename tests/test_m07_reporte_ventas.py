from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC


def _abrir(entrar):
    app = entrar("Administrador")
    app.ir_a("Reporte de Ventas")
    app.espera.until(EC.visibility_of_element_located((By.ID, "rpt-fecha-ini")))
    return app


def test_m07_feliz_muestra_totales_y_detalle(entrar):
    app = _abrir(entrar)
    app.hay_texto("Total vendido en el período")
    app.hay_texto("Detalle de ventas (")
    assert not app.existe(".alert-error")


def test_m07_borde_periodo_sin_ventas(entrar):
    app = _abrir(entrar)
    app.fijar("rpt-fecha-ini", "2000-01-01")
    app.fijar("rpt-fecha-fin", "2000-01-01")                 # rango de un solo día, sin ventas
    app.clic_boton("Buscar")
    app.hay_texto("Sin ventas en este período")
    app.clic_boton("Exportar CSV")
    assert "No hay ventas para exportar" in app.toast("No hay ventas para exportar en este período")


def test_m07_error_fecha_inicio_mayor_que_fin(entrar):
    app = _abrir(entrar)
    app.fijar("rpt-fecha-ini", "2026-12-31")
    app.fijar("rpt-fecha-fin", "2026-01-01")
    app.clic_boton("Buscar")
    assert "no puede ser mayor" in app.texto_de(".alert-error")
