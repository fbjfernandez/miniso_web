import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from conftest import solo_destructiva


def _abrir_formulario(entrar):
    app = entrar("Administrador")
    app.ir_a("Usuarios").clic_boton("Nuevo Usuario")
    return app


def _llenar(app, username, clave):
    app.escribir("us-nombre", "QA")
    app.escribir("us-apellido-paterno", "Prueba")
    app.escribir("us-username", username)
    app.escribir("us-password", clave)


@solo_destructiva
@pytest.mark.destructiva
def test_m08_feliz_crear_usuario(entrar):
    username = "qa" + str(int(time.time()))[-6:]
    app = _abrir_formulario(entrar)
    _llenar(app, username, "1234")
    app.enviar_formulario()
    assert "Usuario creado correctamente" in app.toast("Usuario creado correctamente")
    app.espera.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "tbody"), username))


def test_m08_borde_clave_de_3_caracteres(entrar):
    app = _abrir_formulario(entrar)
    _llenar(app, "qa_borde_" + str(int(time.time()))[-5:], "123")     # el mínimo es 4
    app.enviar_formulario()
    assert "al menos 4 caracteres" in app.toast("La contraseña debe tener al menos 4 caracteres.")


def test_m08_error_usuario_duplicado(entrar):
    app = _abrir_formulario(entrar)
    _llenar(app, "admin01", "1234")
    app.enviar_formulario()
    assert "ya existe" in app.toast("ya existe")
