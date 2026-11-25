"""test_tc10_autenticacion.py — casos TC-F del TC9 de MINISO ejecutados con
Selenium / requests contra la versión v2 (autenticación por JWT).

La app se toma de ``MINISO_URL`` (deploy de Vercel por defecto) y la API de
``MINISO_API_URL`` o de ``MINISO_URL`` + ``/api``. La clave de las cuentas demo
se puede cambiar con ``MINISO_CLAVE``.

Los casos TC-F-014 a TC-F-016 validan el backend con ``requests``: ya no se
envía ``x-user-role``, el rol viaja dentro del token firmado y se manda como
``Authorization: Bearer <token>``.
"""
import os
import time

import pytest
import requests
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

import api_auth
from conftest import solo_destructiva

BASE_URL = os.getenv("MINISO_URL", "https://miniso-web-omega.vercel.app/")
API_URL = api_auth.API_URL
RUTA_LOGIN = "/login"
RUTA_USUARIOS = "/usuarios"          # endpoint solo de Administrador
CLAVE = api_auth.CLAVE
USUARIOS = {
    "admin": ("admin01", CLAVE),
    "cajero": ("cajero01", CLAVE),
    "almacen": ("almacen01", CLAVE),
}
CUENTA_BLOQUEO = os.getenv("MINISO_USER_BLOQUEO", "cajero01")

# Selectores confirmados en frontend/js/pages.js (renderLogin) y app.js
# (renderLayout): ids del formulario, clases del menú lateral y del logout.
SEL = {
    "usuario": (By.ID, "login-user"),
    "clave": (By.ID, "login-pass"),
    "ingresar": (By.CSS_SELECTOR, "button.btn-login"),
    "cerrar_sesion": (By.CSS_SELECTOR, ".btn-logout"),
    "menu": (By.CSS_SELECTOR, ".sidebar-nav a.nav-item"),
    "registrar_venta": (
        By.XPATH,
        "//nav[contains(@class,'sidebar-nav')]//a[contains(., 'Registrar Venta')]",
    ),
}


@pytest.fixture(scope="module", autouse=True)
def cuentas_demo_disponibles():
    """Evita que un bloqueo de una ejecución anterior rompa todo el módulo."""
    api_auth.desbloquear_cuentas_demo()
    yield
    api_auth.desbloquear_cuentas_demo()


# ---------- utilidades ----------
def esperar(driver, localizador, seg=45):
    """Espera explícita (el backend serverless puede tardar en arrancar en frío)."""
    return WebDriverWait(driver, seg).until(EC.visibility_of_element_located(localizador))


def abrir_login(driver):
    driver.get(BASE_URL)
    esperar(driver, SEL["usuario"])


def login(driver, usuario, clave):
    abrir_login(driver)
    driver.find_element(*SEL["usuario"]).clear()
    driver.find_element(*SEL["usuario"]).send_keys(usuario)
    driver.find_element(*SEL["clave"]).clear()
    driver.find_element(*SEL["clave"]).send_keys(clave)
    driver.find_element(*SEL["ingresar"]).click()


def texto_pagina(driver):
    return driver.find_element(By.TAG_NAME, "body").text


def login_visible(driver):
    return len(driver.find_elements(*SEL["usuario"])) > 0 and \
        driver.find_element(*SEL["usuario"]).is_displayed()


def esperar_dashboard(driver, seg=45):
    WebDriverWait(driver, seg).until(lambda d: not login_visible(d))


def menu_textos(driver):
    esperar(driver, SEL["menu"])
    return sorted(e.text.strip() for e in driver.find_elements(*SEL["menu"]) if e.text.strip())


# ---------- HU-01: login ----------
def test_tc_f_001_login_valido_cajero(driver):
    login(driver, "cajero01", CLAVE)
    esperar_dashboard(driver)
    assert "CAJERO" in texto_pagina(driver).upper()
    assert not login_visible(driver)


def test_tc_f_002_clave_incorrecta_se_rechaza(driver):
    login(driver, "cajero01", "Incorrecta_TC9")
    time.sleep(3)  # da tiempo a la respuesta del backend
    assert "Credenciales inválidas" in texto_pagina(driver)
    assert login_visible(driver)
    # reinicia el contador de intentos con un login correcto
    login(driver, "cajero01", CLAVE)
    esperar_dashboard(driver)


def test_tc_f_003_campos_vacios_no_envian_post(driver):
    abrir_login(driver)
    contar = "return performance.getEntriesByType('resource').filter(e=>e.name.includes('/api/login')).length"
    antes = driver.execute_script(contar)
    driver.find_element(*SEL["ingresar"]).click()
    time.sleep(2)
    despues = driver.execute_script(contar)
    assert despues == antes, "Se envió POST /api/login con los campos vacíos"
    assert login_visible(driver)


def test_tc_f_004_flujo_cajero_llega_a_registrar_venta(driver):
    login(driver, "cajero01", CLAVE)
    esperar_dashboard(driver)
    boton = esperar(driver, SEL["registrar_venta"])
    assert boton.is_displayed()
    boton.click()


# ---------- HU-02: cierre de sesión ----------
def test_tc_f_005_cerrar_sesion(driver):
    login(driver, "cajero01", CLAVE)
    esperar_dashboard(driver)
    driver.find_element(*SEL["cerrar_sesion"]).click()
    esperar(driver, SEL["usuario"])
    assert login_visible(driver)


def test_tc_f_006_atras_tras_logout_no_muestra_contenido_interno(driver):
    login(driver, "cajero01", CLAVE)
    esperar_dashboard(driver)
    driver.find_element(*SEL["cerrar_sesion"]).click()
    esperar(driver, SEL["usuario"])
    # La sesión debe quedar borrada (no se restaura al volver atrás)
    assert driver.execute_script("return sessionStorage.getItem('miniso_sesion')") is None
    driver.back()
    time.sleep(2)
    # Puede quedarse en el login o salir de la app, pero nunca mostrar el panel interno
    assert not driver.find_elements(By.CSS_SELECTOR, ".sidebar-role-badge")
    assert not driver.find_elements(By.CSS_SELECTOR, ".sidebar-nav")


def test_tc_f_007_logout_sin_sesion_no_da_error(driver):
    abrir_login(driver)
    driver.execute_script("localStorage.clear(); sessionStorage.clear();")
    driver.refresh()
    esperar(driver, SEL["usuario"])
    assert login_visible(driver)


# ---------- HU-06: menú por rol ----------
def test_tc_f_011_menu_cajero(driver):
    login(driver, "cajero01", CLAVE)
    esperar_dashboard(driver)
    esperado = sorted(["Dashboard", "Registrar Venta", "Clientes", "Devoluciones"])
    assert menu_textos(driver) == esperado


def test_tc_f_012_menu_almacenero(driver):
    login(driver, "almacen01", CLAVE)
    esperar_dashboard(driver)
    esperado = sorted(
        ["Dashboard", "Registrar Entrada", "Productos Agotados", "Reporte de Inventario"]
    )
    assert menu_textos(driver) == esperado


# ---------- HU-07: backend (API con requests + JWT) ----------
def test_tc_f_014_admin_accede_a_endpoint_protegido(driver):
    abrir_login(driver)
    jwt = api_auth.token("admin01", CLAVE)
    r = requests.get(API_URL + RUTA_USUARIOS, headers=api_auth.headers(jwt), timeout=60)
    assert r.status_code == 200, f"Se esperaba 200 y llegó {r.status_code}: {r.text[:300]}"


def test_tc_f_015_cajero_recibe_403_en_endpoint_de_admin(driver):
    abrir_login(driver)
    jwt = api_auth.token("cajero01", CLAVE)
    r = requests.get(API_URL + RUTA_USUARIOS, headers=api_auth.headers(jwt), timeout=60)
    assert r.status_code == 403, f"Se esperaba 403 y llegó {r.status_code}: {r.text[:300]}"


def test_tc_f_016_sin_token_recibe_401(driver):
    abrir_login(driver)
    r = requests.get(API_URL + RUTA_USUARIOS, timeout=60)
    assert r.status_code == 401, f"Se esperaba 401 y llegó {r.status_code}"


def test_tc_f_017_header_x_user_role_falsificado_recibe_401(driver):
    """El header antiguo ya no autentica: el rol debe venir firmado en el JWT."""
    abrir_login(driver)
    r = requests.get(
        API_URL + RUTA_USUARIOS,
        headers={"x-user-role": "Administrador"},
        timeout=60,
    )
    assert r.status_code == 401, f"Se esperaba 401 y llegó {r.status_code}"


# ---------- HU-08: cuenta bloqueada ----------
@solo_destructiva
@pytest.mark.destructiva
def test_tc_f_020_cuenta_se_bloquea_a_los_5_intentos_y_se_desbloquea(driver):
    """TC-F-020: el 5.º intento fallido bloquea la cuenta demo.

    Al terminar (incluso si la prueba falla) la cuenta se desbloquea para no
    romper los casos siguientes ni las demás suites.
    """
    cuenta = os.getenv("MINISO_USER_BLOQUEO")
    creada = None
    if not cuenta:
        cuenta = api_auth.crear_usuario_desechable("qa_tc10")
        creada = cuenta
    try:
        assert api_auth.desbloquear(cuenta), (
            f"No se pudo preparar la cuenta {cuenta} (¿admin01 bloqueado?)"
        )
        ultimo = None
        for _ in range(5):
            ultimo = api_auth.login(cuenta, "clave_mala_tc10")
        assert ultimo is not None and ultimo.status_code == 403, (
            f"Se esperaba 403 tras 5 fallos y llegó "
            f"{getattr(ultimo, 'status_code', 'sin respuesta')}"
        )
        assert "bloqueado" in ultimo.text.lower()

        # Aun con la clave correcta la cuenta bloqueada no debe entrar
        r = api_auth.login(cuenta, CLAVE)
        assert r.status_code == 403, f"Se esperaba 403 y llegó {r.status_code}"

        login(driver, cuenta, CLAVE)
        time.sleep(3)
        assert login_visible(driver)
    finally:
        try:
            assert api_auth.desbloquear(cuenta), (
                f"La cuenta {cuenta} quedó bloqueada: desbloquéala desde Usuarios"
            )
        finally:
            if creada:
                api_auth.eliminar_usuario(creada)
