import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from conftest import solo_destructiva


def _abrir_formulario(entrar):
    app = entrar("Administrador")
    app.ir_a("Proveedores").clic_boton("Nuevo Proveedor")
    return app


@solo_destructiva
@pytest.mark.destructiva
def test_m05_feliz_crear_proveedor(entrar):
    sufijo = str(int(time.time() * 1000))[-9:]
    ruc = "20" + sufijo
    app = _abrir_formulario(entrar)
    app.escribir("pv-nombre", f"QA Proveedor {sufijo} SAC")
    app.escribir("pv-ruc", ruc)
    app.escribir("pv-contacto", "QA Contacto")
    app.escribir("pv-telefono", "999888777")
    app.escribir("pv-email", f"qa{sufijo}@test.com")
    app.enviar_formulario()
    assert "Proveedor registrado correctamente" in app.toast("Proveedor registrado correctamente")
    app.espera.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "tbody"), ruc))


def test_m05_borde_ruc_de_10_11_y_13_digitos(entrar):
    app = _abrir_formulario(entrar)
    app.escribir("pv-ruc", "1234567890")                           # 10 dígitos
    assert app.validez("pv-ruc", "patternMismatch") is True
    app.escribir("pv-ruc", "12345678901")                          # 11 dígitos
    assert app.validez("pv-ruc", "patternMismatch") is False
    app.escribir("pv-ruc", "1234567890123")                        # 13 dígitos
    assert app.valor("pv-ruc") == "12345678901"                    # maxlength=11 lo recorta


def test_m05_error_ruc_con_letras_y_email_invalido(entrar):
    app = _abrir_formulario(entrar)
    app.escribir("pv-ruc", "ABCDEFGHIJK")
    app.escribir("pv-email", "sin-arroba")
    assert app.validez("pv-ruc", "patternMismatch") is True
    assert app.validez("pv-email", "typeMismatch") is True
    assert app.formulario_valido("pv-ruc") is False
