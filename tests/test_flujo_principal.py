import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from paginas.login_page import LoginPage

URL_SISTEMA = "https://miniso-web-omega.vercel.app/"

@pytest.fixture
def driver():
    opciones = webdriver.ChromeOptions()
    opciones.add_argument("--start-maximized")
    driver_instancia = webdriver.Chrome(options=opciones)
    yield driver_instancia
    driver_instancia.quit()

def test_acceso_cajero_exitoso(driver):
    login = LoginPage(driver, URL_SISTEMA)
    
    login.abrir().iniciar_sesion("cajero01", "1234")
    
    WebDriverWait(driver, 10).until(lambda d: "login" not in d.current_url.lower())
    
    driver.save_screenshot("TC8_Evidencia.png")
    assert "login" not in driver.current_url.lower()