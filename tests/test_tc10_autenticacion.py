"""test_tc10_autenticacion.py — casos TC-F del TC9 de MINISO ejecutados con Selenium / requests.

ANTES DE CORRER: ajusta BASE_URL, API_URL, las rutas y los selectores (diccionario SEL).
Todo lo marcado con # AJUSTAR son suposiciones mías: no pude leer tu código.
Cómo obtenerlos: abre la app, clic derecho -> Inspeccionar (F12) sobre cada campo/botón
y mira su id / name / class; y en la pestaña Network mira la URL real de cada petición.
"""
import os
import time

import pytest
import requests
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = "https://miniso-web-omega.vercel.app"
API_URL = "https://TU-BACKEND.onrender.com"          # AJUSTAR (F12 -> Network -> login)
RUTA_LOGIN = "/api/login"
RUTA_ADMIN_LISTAR = "/api/usuarios"                  # AJUSTAR: endpoint solo de Administrador
CLAVE = os.getenv("MINISO_CLAVE", "1234")            # clave de las cuentas de prueba del README
USUARIOS = {                                         # (usuario, clave) de cada rol
    "admin": ("admin01", "1234"),
    "cajero": ("cajero01", "1234"),
    "almacen": ("almacen01", "1234"),
}
CUENTA_BLOQUEADA = "usuario_tc9_bloqueo"             # créala y bloquéala antes (TC-F-020)

SEL = {                                              # AJUSTAR todos
    "usuario": (By.ID, "usuario"),
    "clave": (By.ID, "password"),
    "ingresar": (By.CSS_SELECTOR, "button[type='submit']"),
    "cerrar_sesion": (By.XPATH, "//*[contains(text(),'Cerrar sesión')]"),
    "menu": (By.CSS_SELECTOR, "nav a"),
    "registrar_venta": (By.XPATH, "//*[contains(text(),'Registrar Venta')]"),
}


# ---------- utilidades ----------
def esperar(driver, localizador, seg=45):
    """Espera explícita (el backend gratuito de Render puede tardar ~30 s en despertar)."""
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
    assert "CAJERO" in texto_pagina(driver).upper()   # AJUSTAR si el rol se muestra distinto
    assert not login_visible(driver)


def test_tc_f_002_clave_incorrecta_se_rechaza(driver):
    login(driver, "cajero01", "Incorrecta_TC9")
    time.sleep(3)  # da tiempo a la respuesta del backend
    assert "Usuario o contraseña incorrectos" in texto_pagina(driver)
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
    driver.back()
    time.sleep(2)
    assert login_visible(driver)
    assert "CAJERO" not in texto_pagina(driver).upper()


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
    esperado = sorted(["Registrar Entrada", "Productos Agotados", "Reporte de Inventario"])
    assert menu_textos(driver) == esperado


# ---------- HU-07: backend (API con requests) ----------
def test_tc_f_014_admin_accede_a_endpoint_protegido(driver):
    r = requests.get(API_URL + RUTA_ADMIN_LISTAR, headers={"x-user-role": "Administrador"}, timeout=60)
    assert r.status_code == 200, f"Se esperaba 200 y llegó {r.status_code}"


def test_tc_f_015_cajero_recibe_403_en_endpoint_de_admin(driver):
    r = requests.get(API_URL + RUTA_ADMIN_LISTAR, headers={"x-user-role": "Cajero"}, timeout=60)
    assert r.status_code == 403, f"Se esperaba 403 y llegó {r.status_code}"


def test_tc_f_016_sin_cabecera_de_rol_recibe_401(driver):
    r = requests.get(API_URL + RUTA_ADMIN_LISTAR, timeout=60)
    assert r.status_code == 401, f"Se esperaba 401 y llegó {r.status_code}"


# ---------- HU-08: cuenta bloqueada ----------
def test_tc_f_020_cuenta_bloqueada_no_entra_con_clave_correcta(driver):
    
    r = requests.post(API_URL + RUTA_LOGIN,
                      json={"usuario": CUENTA_BLOQUEADA, "password": CLAVE}, timeout=60)  
    assert r.status_code == 403, f"Se esperaba 403 y llegó {r.status_code}"
    login(driver, CUENTA_BLOQUEADA, CLAVE)
    time.sleep(3)
    assert login_visible(driver)