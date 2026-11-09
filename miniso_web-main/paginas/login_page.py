from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class LoginPage:
    TXT_USUARIO = (By.XPATH, "//input[@type='text' or contains(@name, 'user') or contains(@id, 'user')]")
    TXT_CLAVE = (By.XPATH, "//input[@type='password']")
    BTN_INGRESAR = (By.XPATH, "//button[@type='submit' or contains(text(), 'Ingresar') or contains(text(), 'Login')]")

    def __init__(self, driver, base_url):
        self.driver = driver
        self.base_url = base_url
        self.espera = WebDriverWait(self.driver, 10)

    def abrir(self):
        self.driver.get(self.base_url)
        return self

    def iniciar_sesion(self, usuario, clave):
        self.espera.until(EC.visibility_of_element_located(self.TXT_USUARIO)).send_keys(usuario)
        self.espera.until(EC.visibility_of_element_located(self.TXT_CLAVE)).send_keys(clave)
        self.espera.until(EC.element_to_be_clickable(self.BTN_INGRESAR)).click()
        return self