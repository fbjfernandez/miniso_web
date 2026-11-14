import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from conftest import solo_destructiva


def _abrir_formulario(entrar):
    app = entrar("Cajero")
    app.ir_a("Clientes").clic_boton("Registrar Cliente")
    return app


@solo_destructiva
@pytest.mark.destructiva
def test_m02_feliz_registrar_cliente(entrar):
    dni = str(int(time.time()))[-8:]
    app = _abrir_formulario(entrar)
    app.escribir("cl-nombre", f"QA Cliente {dni}")
    app.escribir("cl-dni", dni)
    app.escribir("cl-telefono", "999888777")
    app.escribir("cl-email", f"qa{dni}@test.com")
    app.enviar_formulario()
    assert "Cliente registrado correctamente" in app.toast("Cliente registrado correctamente")
    app.espera.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "tbody"), dni))


def test_m02_borde_dni_se_corta_en_8_digitos(entrar):
    app = _abrir_formulario(entrar)
    app.escribir("cl-dni", "1234567890123")      # 13 dígitos
    assert app.valor("cl-dni") == "12345678"


def test_m02_error_dni_de_5_digitos_lo_rechaza_el_servidor(entrar):
    app = _abrir_formulario(entrar)
    app.escribir("cl-nombre", "QA Rechazo")
    app.escribir("cl-dni", "12345")
    app.escribir("cl-telefono", "999888777")
    app.escribir("cl-email", "qa.rechazo@test.com")
    app.enviar_formulario()
    assert "El DNI debe tener 8 dígitos" in app.toast("El DNI debe tener 8 dígitos")
