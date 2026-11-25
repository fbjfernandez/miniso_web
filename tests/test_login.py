import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from paginas.login_page import LoginPage
from paginas.app_page import AppPage
from conftest import URL, USUARIOS, CLAVE, solo_destructiva
import api_auth


@pytest.mark.parametrize("rol", ["Cajero", "Administrador", "Almacenero"])
def test_login_valido_por_rol(driver, rol):
    LoginPage(driver, URL).abrir().iniciar_sesion(USUARIOS[rol], CLAVE)
    assert AppPage(driver).rol_activo().upper() == rol.upper()


def test_login_usuario_inexistente(driver):
    # Usuario que no existe: no suma intentos fallidos a ninguna cuenta real
    login = LoginPage(driver, URL).abrir().iniciar_sesion("noexiste99", "xxxx")
    assert "Credenciales inválidas" in login.mensaje_error()


def test_login_campos_vacios_no_envia(driver):
    login = LoginPage(driver, URL).abrir()
    driver.find_element(*login.BTN_INGRESAR).click()
    assert driver.find_element(*login.TXT_USUARIO).get_attribute("validationMessage") != ""
    assert not driver.find_elements(*login.ERROR)
    assert not driver.find_elements(*AppPage.ROL)


def test_cerrar_sesion(driver, entrar):
    entrar("Cajero").cerrar_sesion()
    LoginPage(driver, URL).espera.until(EC.visibility_of_element_located(LoginPage.TXT_USUARIO))


def test_sesion_sobrevive_a_recargar(driver, entrar):
    entrar("Administrador")
    driver.refresh()
    assert AppPage(driver).rol_activo().lower() == "administrador"


@solo_destructiva
@pytest.mark.destructiva
def test_bloqueo_tras_5_intentos(driver):
    """Usa una cuenta DESECHABLE (el admin puede desbloquearla en Usuarios)."""
    import os
    cuenta = os.getenv("MINISO_USER_BLOQUEO")
    creada = None
    if not cuenta:
        cuenta = api_auth.crear_usuario_desechable("qa_bloqueo")
        creada = cuenta
    try:
        assert api_auth.desbloquear(cuenta), f"No se pudo preparar la cuenta {cuenta}"
        login = LoginPage(driver, URL).abrir()
        for _ in range(5):
            login.iniciar_sesion(cuenta, "clave_mala")
            driver.implicitly_wait(0)
            login.espera.until(EC.visibility_of_element_located(login.ERROR))
            login.espera.until(EC.element_to_be_clickable(login.BTN_INGRESAR))
        assert "bloqueado" in login.mensaje_error().lower()
    finally:
        # La cuenta debe quedar desbloqueada y, si la creó la prueba, eliminada.
        try:
            assert api_auth.desbloquear(cuenta), (
                f"La cuenta {cuenta} quedó bloqueada: desbloquéala desde Usuarios"
            )
        finally:
            if creada:
                api_auth.eliminar_usuario(creada)
