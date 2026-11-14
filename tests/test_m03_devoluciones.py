import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from conftest import solo_destructiva

BTN_DEVOLVER = "//tbody[@id='dev-tbody']//button[contains(., 'Devolver')]"


def _abrir_modal_primera_venta(app):
    app.ir_a("Devoluciones")
    app.espera.until(EC.presence_of_element_located((By.ID, "dev-tbody")))
    botones = app.driver.find_elements(By.XPATH, BTN_DEVOLVER)
    if not botones:
        pytest.skip("No hay ventas 'Completadas' para devolver (registra una venta primero)")
    botones[0].click()
    app.espera.until(EC.visibility_of_element_located((By.ID, "dev-motivo")))


@solo_destructiva
@pytest.mark.destructiva
def test_m03_feliz_devolucion_total(entrar):
    app = entrar("Cajero")
    _abrir_modal_primera_venta(app)
    Select(app.driver.find_element(By.ID, "dev-motivo")).select_by_visible_text("Producto defectuoso")
    app.driver.find_element(By.ID, "dev-confirmar").click()
    assert "registrada" in app.toast("registrada")


def test_m03_borde_busqueda_sin_resultados(entrar):
    app = entrar("Cajero")
    app.ir_a("Devoluciones")
    app.escribir("dev-buscar", "ZZZ-NO-EXISTE-999")
    assert "Sin resultados" in app.texto_de("#dev-tbody")


def test_m03_error_confirmar_sin_motivo(entrar):
    app = entrar("Cajero")
    _abrir_modal_primera_venta(app)
    app.driver.find_element(By.ID, "dev-confirmar").click()
    assert "Selecciona un motivo" in app.toast("Selecciona un motivo para la devolución")
