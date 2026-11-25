import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from conftest import solo_destructiva
import api_auth


def _abrir_nueva_orden(entrar):
    app = entrar("Administrador")
    app.ir_a("Órdenes de Compra").clic_boton("Generar Orden de Compra")
    app.espera.until(EC.visibility_of_element_located((By.ID, "oc-buscar-proveedor")))
    return app


def _elegir_proveedor(app):
    app.clic_elemento(app.driver.find_element(By.ID, "oc-buscar-proveedor"))
    item = app.espera.until(EC.element_to_be_clickable(
        (By.CSS_SELECTOR, "#oc-tab-content .lista-busqueda .item-busqueda")))
    app.clic_elemento(item)


def _agregar_primer_producto(app):
    boton = app.espera.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#oc-productos-tbody button")))
    app.clic_elemento(boton)


@solo_destructiva
@pytest.mark.destructiva
def test_m06_feliz_generar_orden(entrar):
    ordenes_antes = api_auth.ids_ordenes()
    try:
        app = _abrir_nueva_orden(entrar)
        _elegir_proveedor(app)
        _agregar_primer_producto(app)
        app.clic_elemento(app.driver.find_element(By.ID, "oc-grabar"))
        assert "registrada correctamente" in app.toast("registrada correctamente")
    finally:
        for orden in api_auth.sb_select("orden_compra", select="id"):
            if orden["id"] not in ordenes_antes:
                api_auth.eliminar_orden(orden["id"])


def test_m06_borde_quitar_la_unica_unidad_vacia_el_carrito(entrar):
    app = _abrir_nueva_orden(entrar)
    _agregar_primer_producto(app)
    qty = app.driver.find_element(By.CSS_SELECTOR, "#oc-cart-tbody .qty-btn")
    app.clic_elemento(qty)   # botón '−' con cantidad 1
    assert "Agrega productos a la orden" in app.texto_de("#oc-cart-tbody")
    assert app.texto_de("#oc-total") == "0.00"


def test_m06_error_grabar_sin_proveedor(entrar):
    app = _abrir_nueva_orden(entrar)
    _agregar_primer_producto(app)
    app.clic_elemento(app.driver.find_element(By.ID, "oc-grabar"))
    assert "Selecciona un proveedor" in app.toast("Selecciona un proveedor para la orden")
