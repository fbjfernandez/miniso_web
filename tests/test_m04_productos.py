import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from conftest import solo_destructiva


def _abrir_formulario(entrar):
    app = entrar("Administrador")
    app.ir_a("Productos").clic_boton("Nuevo Producto")
    return app


@solo_destructiva
@pytest.mark.destructiva
def test_m04_feliz_crear_producto(entrar):
    nombre = f"QA Producto {int(time.time())}"
    app = _abrir_formulario(entrar)
    app.escribir("pr-nombre", nombre)
    app.escribir("pr-categoria", "QA")
    app.escribir("pr-precio", "9.90")
    app.escribir("pr-costo", "5")
    app.escribir("pr-stock", "10")
    app.escribir("pr-stockmin", "2")
    Select(app.driver.find_element(By.ID, "pr-proveedor")).select_by_index(1)
    app.enviar_formulario()
    assert "Producto registrado correctamente" in app.toast("Producto registrado correctamente")
    app.espera.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "tbody"), nombre))


def test_m04_borde_limites_de_precio_y_stock(entrar):
    app = _abrir_formulario(entrar)
    app.escribir("pr-precio", "0")
    assert app.validez("pr-precio", "rangeUnderflow") is False     # 0 es el mínimo permitido
    app.escribir("pr-precio", "-0.01")
    assert app.validez("pr-precio", "rangeUnderflow") is True      # justo debajo del límite
    app.escribir("pr-stock", "0")
    assert app.validez("pr-stock", "rangeUnderflow") is False
    app.escribir("pr-stock", "1.5")
    assert app.validez("pr-stock", "stepMismatch") is True         # el stock no admite decimales


def test_m04_error_formulario_vacio_es_invalido(entrar):
    app = _abrir_formulario(entrar)
    app.escribir("pr-stock", "")                                   # sin stock
    assert app.formulario_valido("pr-nombre") is False
    assert app.validez("pr-nombre", "valueMissing") is True
    assert app.validez("pr-proveedor", "valueMissing") is True
