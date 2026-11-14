import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from conftest import solo_destructiva

BTN_RECIBIR = "//tbody[@id='entrada-ordenes-tbody']//button[contains(., 'Recibir')]"
CART = "#entrada-cart-tbody"


def _recibir_primera_orden(entrar):
    app = entrar("Almacenero")
    app.ir_a("Registrar Entrada")
    app.espera.until(EC.presence_of_element_located((By.ID, "entrada-ordenes-tbody")))
    botones = app.driver.find_elements(By.XPATH, BTN_RECIBIR)
    if not botones:
        pytest.skip("No hay órdenes pendientes (genera una como Administrador)")
    botones[0].click()
    app.espera.until(EC.presence_of_element_located((By.CSS_SELECTOR, f"{CART} .qty-input")))
    return app


def _cantidad(app):
    return int(app.driver.find_element(By.CSS_SELECTOR, f"{CART} .qty-input").get_attribute("value"))


@solo_destructiva
@pytest.mark.destructiva
def test_m09_feliz_confirmar_entrada(entrar):
    app = _recibir_primera_orden(entrar)
    app.driver.find_element(By.ID, "entrada-confirmar").click()
    assert "Entrada registrada" in app.toast("Entrada registrada")


def test_m09_borde_cantidad_entre_1_y_lo_pedido(entrar):
    app = _recibir_primera_orden(entrar)
    pedida = int(app.driver.find_element(By.CSS_SELECTOR, f"{CART} tr td:nth-child(2)").text)
    if pedida > 50:
        pytest.skip(f"Se pidieron {pedida} unidades (demasiados clics)")
    for _ in range(pedida + 2):                                   # intenta pasarse del máximo
        app.driver.find_elements(By.CSS_SELECTOR, f"{CART} .qty-btn")[1].click()
    assert _cantidad(app) == pedida
    for _ in range(pedida + 2):                                   # intenta bajar de 1
        app.driver.find_elements(By.CSS_SELECTOR, f"{CART} .qty-btn")[0].click()
    assert _cantidad(app) == 1


def test_m09_error_confirmar_sin_productos(entrar):
    app = _recibir_primera_orden(entrar)
    while app.existe(f"{CART} .btn-ghost"):
        app.driver.find_element(By.CSS_SELECTOR, f"{CART} .btn-ghost").click()
    app.driver.find_element(By.ID, "entrada-confirmar").click()
    assert "Agrega al menos un producto" in app.toast("Agrega al menos un producto recibido")
