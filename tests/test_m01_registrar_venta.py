import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from conftest import solo_destructiva

TBODY = "#venta-productos-tbody"
BTN_CONFIRMAR = "button[onclick='confirmarVenta()']"


def _vendibles(app):
    """[(stock, codigo, boton)] de productos con el botón '+' habilitado."""
    import time
    app.espera.until(EC.presence_of_element_located((By.CSS_SELECTOR, f"{TBODY} tr")))
    time.sleep(1)  # Da tiempo a que desaparezca la fila de 'Cargando...' y pinten los datos de la BD
    res = []
    for tr in app.driver.find_elements(By.CSS_SELECTOR, f"{TBODY} tr"):
        tds = tr.find_elements(By.TAG_NAME, "td")
        if len(tds) < 5:
            continue
        btn = tds[4].find_element(By.TAG_NAME, "button")
        if btn.is_enabled():
            res.append((int(tds[3].text), tds[0].text.strip(), btn))
    if not res:
        pytest.skip("No hay productos con stock para vender")
    return res



def _stock_de(app, codigo):
    xp = f"//tbody[@id='venta-productos-tbody']/tr[td[1][normalize-space()='{codigo}']]/td[4]"
    return int(app.espera.until(EC.visibility_of_element_located((By.XPATH, xp))).text)



def test_m01_feliz_venta_completa_descuenta_stock(entrar):
    app = entrar("Cajero")
    app.ir_a("Registrar Venta")
    _, codigo, boton = _vendibles(app)[0]
    boton.click()
    stock_antes = _stock_de(app, codigo)
    app.driver.find_element(By.ID, "venta-buscar-cliente").click()
    app.espera.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#venta-clientes-resultados .item-busqueda"))).click()
    app.driver.find_element(By.CSS_SELECTOR, BTN_CONFIRMAR).click()
    assert "Comprobante" in app.toast("Comprobante")
    app.ir_a("Registrar Venta")
    assert _stock_de(app, codigo) == stock_antes - 1


def test_m01_borde_no_se_vende_mas_que_el_stock(entrar):
    app = entrar("Cajero")
    app.ir_a("Registrar Venta")
    stock, codigo, boton = min(_vendibles(app), key=lambda x: x[0])
    if stock > 30:
        pytest.skip(f"El producto con menos stock tiene {stock} unidades (demasiados clics)")
    for _ in range(stock + 1):           # un clic de más sobre el límite
        boton.click()
    assert "No hay más stock disponible" in app.toast("No hay más stock disponible")
    cantidad = app.driver.find_element(By.CSS_SELECTOR, "#venta-cart-tbody .qty-input").get_attribute("value")
    assert cantidad == str(stock)


def test_m01_error_confirmar_sin_cliente(entrar):
    app = entrar("Cajero")
    app.ir_a("Registrar Venta")
    _vendibles(app)[0][2].click()
    app.driver.find_element(By.CSS_SELECTOR, BTN_CONFIRMAR).click()
    assert "cliente" in app.toast("Debe seleccionar o registrar un cliente").lower()
