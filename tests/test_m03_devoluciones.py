import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from conftest import solo_destructiva
import api_auth

BTN_DEVOLVER = "//tbody[@id='dev-tbody']//button[contains(., 'Devolver')]"


def _abrir_modal_primera_venta(app):
    app.ir_a("Devoluciones")
    app.espera.until(EC.presence_of_element_located((By.ID, "dev-tbody")))
    botones = app.driver.find_elements(By.XPATH, BTN_DEVOLVER)
    if not botones:
        pytest.skip("No hay ventas 'Completadas' para devolver (registra una venta primero)")
    app.clic_elemento(botones[0])
    app.espera.until(EC.visibility_of_element_located((By.ID, "dev-motivo")))


@solo_destructiva
@pytest.mark.destructiva
def test_m03_feliz_devolucion_total(entrar):
    # Se devuelve una venta creada para esta prueba (no una venta histórica):
    # venta + devolución se cancelan y el finally borra ambos registros.
    ctx = api_auth.crear_venta_prueba("cajero01", cantidad=1)
    try:
        comprobante = ctx["venta"]["comprobante"]
        app = entrar("Cajero")
        app.ir_a("Devoluciones")
        app.espera.until(EC.presence_of_element_located((By.ID, "dev-tbody")))
        app.escribir("dev-buscar", comprobante)
        xp = (
            f"//tbody[@id='dev-tbody']/tr[td[2][normalize-space()='{comprobante}']]"
            "//button[contains(., 'Devolver')]"
        )
        boton = app.espera.until(EC.element_to_be_clickable((By.XPATH, xp)))
        app.clic_elemento(boton)
        app.espera.until(EC.visibility_of_element_located((By.ID, "dev-motivo")))
        Select(app.driver.find_element(By.ID, "dev-motivo")).select_by_visible_text("Producto defectuoso")
        app.clic_elemento(app.driver.find_element(By.ID, "dev-confirmar"))
        assert "registrada" in app.toast("registrada")
    finally:
        api_auth.limpiar_venta_prueba(ctx)


def test_m03_borde_busqueda_sin_resultados(entrar):
    app = entrar("Cajero")
    app.ir_a("Devoluciones")
    app.escribir("dev-buscar", "ZZZ-NO-EXISTE-999")
    assert "Sin resultados" in app.texto_de("#dev-tbody")


def test_m03_error_confirmar_sin_motivo(entrar):
    app = entrar("Cajero")
    _abrir_modal_primera_venta(app)
    app.clic_elemento(app.driver.find_element(By.ID, "dev-confirmar"))
    assert "Selecciona un motivo" in app.toast("Selecciona un motivo para la devolución")
