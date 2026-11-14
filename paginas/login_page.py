from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class LoginPage:
    TXT_USUARIO = (By.ID, "login-user")
    TXT_CLAVE = (By.ID, "login-pass")
    BTN_INGRESAR = (By.CSS_SELECTOR, "button.btn-login")
    ERROR = (By.CSS_SELECTOR, "#login-error .alert-error")

    def __init__(self, driver, base_url, timeout=45):
        # 45 s: el backend gratuito de Render puede tardar ~30 s en despertar
        self.driver = driver
        self.base_url = base_url
        self.espera = WebDriverWait(driver, timeout)

    def abrir(self):
        self.driver.get(self.base_url)
        self.espera.until(EC.visibility_of_element_located(self.TXT_USUARIO))
        return self

    def iniciar_sesion(self, usuario, clave):
        self.espera.until(EC.visibility_of_element_located(self.TXT_USUARIO)).clear()
        self.driver.find_element(*self.TXT_USUARIO).send_keys(usuario)
        self.driver.find_element(*self.TXT_CLAVE).clear()
        self.driver.find_element(*self.TXT_CLAVE).send_keys(clave)
        self.espera.until(EC.element_to_be_clickable(self.BTN_INGRESAR)).click()
        return self

    def mensaje_error(self):
        return self.espera.until(EC.visibility_of_element_located(self.ERROR)).text
