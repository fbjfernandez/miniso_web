import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from paginas.app_page import soles
from conftest import destructiva
from ayudas import unico, romper_token

TBODY = "#venta-productos-tbody"
CART = "#venta-cart-tbody"
BTN_CONFIRMAR = "button[onclick='confirmarVenta()']"


def _ir(entrar):
    app = entrar("Cajero")
    app.ir_a("Registrar Venta")
    return app


def _vendibles(app):
    app.espera.until(EC.presence_of_element_located((By.CSS_SELECTOR, f"{TBODY} tr")))
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


def _agregar_primero(app, minimo_stock=1):
    for stock, codigo, boton in _vendibles(app):
        if stock >= minimo_stock:
            boton.click()
            return stock, codigo
    pytest.skip(f"No hay productos con al menos {minimo_stock} unidades")


def _stock_de(app, codigo):
    xp = f"//tbody[@id='venta-productos-tbody']/tr[td[1][normalize-space()='{codigo}']]/td[4]"
    return int(app.espera.until(EC.visibility_of_element_located((By.XPATH, xp))).text)


def _elegir_cliente(app):
    app.driver.find_element(By.ID, "venta-buscar-cliente").click()
    if app.existe("#venta-clientes-resultados .item-busqueda-vacio"):
        pytest.skip("No hay clientes registrados")
    app.espera.until(EC.element_to_be_clickable(
        (By.CSS_SELECTOR, "#venta-clientes-resultados .item-busqueda"))).click()


# ---------------- FELICES ----------------
@destructiva
def test_m01_feliz_venta_completa_descuenta_stock(entrar):
    app = _ir(entrar)
    _, codigo = _agregar_primero(app)
    stock_antes = _stock_de(app, codigo)
    _elegir_cliente(app)
    app.driver.find_element(By.CSS_SELECTOR, BTN_CONFIRMAR).click()
    assert "Comprobante" in app.toast("Comprobante")
    app.ir_a("Registrar Venta")
    assert _stock_de(app, codigo) == stock_antes - 1


def test_m01_feliz_buscar_producto_por_codigo(entrar):
    app = _ir(entrar)
    codigo = _vendibles(app)[0][1]
    app.escribir("venta-buscar-producto", codigo)
    filas = app.filas(f"{TBODY} tr")
    assert filas and all(codigo.lower() in (f[0] + f[1]).lower() for f in filas)


def test_m01_feliz_cambiar_cantidad_actualiza_total(entrar):
    app = _ir(entrar)
    _agregar_primero(app, minimo_stock=2)
    precio = soles(app.filas(f"{CART} tr")[0][1])
    assert float(app.texto_de("#venta-total")) == pytest.approx(precio)
    app.driver.find_elements(By.CSS_SELECTOR, f"{CART} .qty-btn")[1].click()      # '+'
    assert float(app.texto_de("#venta-total")) == pytest.approx(precio * 2)


@destructiva
def test_m01_feliz_registrar_cliente_desde_la_venta(entrar):
    dni = unico()
    app = _ir(entrar)
    _vendibles(app)
    app.clic_boton("Registrar nuevo cliente")
    app.escribir("cl-nombre", f"QA Venta {dni}")
    app.escribir("cl-dni", dni)
    app.escribir("cl-telefono", "999888777")
    app.escribir("cl-email", f"qa{dni}@test.com")
    app.enviar_formulario()
    assert app.toast("Cliente registrado correctamente")
    app.hay_texto(f"DNI: {dni}")


def test_m01_feliz_quitar_producto_del_carrito(entrar):
    app = _ir(entrar)
    _agregar_primero(app)
    app.driver.find_element(By.CSS_SELECTOR, f"{CART} .btn-ghost").click()
    assert "Agrega productos a la venta" in app.texto_de(CART)


# ---------------- BORDES ----------------
def test_m01_borde_no_se_vende_mas_que_el_stock(entrar):
    app = _ir(entrar)
    stock, _, boton = min(_vendibles(app), key=lambda x: x[0])
    if stock > 30:
        pytest.skip(f"El producto con menos stock tiene {stock} unidades (demasiados clics)")
    for _ in range(stock + 1):
        boton.click()
    assert app.toast("No hay más stock disponible")
    assert app.driver.find_element(By.CSS_SELECTOR, f"{CART} .qty-input").get_attribute("value") == str(stock)


def test_m01_borde_bajar_cantidad_a_cero_quita_el_producto(entrar):
    app = _ir(entrar)
    _agregar_primero(app)
    app.driver.find_element(By.CSS_SELECTOR, f"{CART} .qty-btn").click()          # '−' con cantidad 1
    assert "Agrega productos a la venta" in app.texto_de(CART)
    assert app.texto_de("#venta-total") == "0.00"


def test_m01_borde_busqueda_sin_resultados(entrar):
    app = _ir(entrar)
    _vendibles(app)
    app.escribir("venta-buscar-producto", "ZZZ-NO-EXISTE-999")
    assert "Sin resultados" in app.texto_de(TBODY)


# ---------------- ERRORES ----------------
def test_m01_error_confirmar_sin_productos(entrar):
    app = _ir(entrar)
    _vendibles(app)
    app.driver.find_element(By.CSS_SELECTOR, BTN_CONFIRMAR).click()
    assert app.toast("Agrega al menos un producto a la venta")


def test_m01_error_confirmar_sin_cliente(entrar):
    app = _ir(entrar)
    _agregar_primero(app)
    app.driver.find_element(By.CSS_SELECTOR, BTN_CONFIRMAR).click()
    assert app.toast("Debe seleccionar o registrar un cliente")


def test_m01_error_cliente_nuevo_con_dni_invalido(entrar):
    app = _ir(entrar)
    _vendibles(app)
    app.clic_boton("Registrar nuevo cliente")
    app.escribir("cl-nombre", "QA Rechazo")
    app.escribir("cl-dni", "123")
    app.escribir("cl-telefono", "999888777")
    app.escribir("cl-email", "qa.rechazo@test.com")
    app.enviar_formulario()
    assert app.toast("El DNI debe tener 8 dígitos")


def test_m01_error_sesion_vencida_al_confirmar(entrar):
    app = _ir(entrar)
    _agregar_primero(app)
    _elegir_cliente(app)
    romper_token(app)
    app.driver.find_element(By.CSS_SELECTOR, BTN_CONFIRMAR).click()
    assert app.toast("Tu sesión expiró")
