from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class AppPage:
    """Pantallas internas (después del login). Es una SPA: la URL nunca cambia."""
    ROL = (By.CSS_SELECTOR, ".sidebar-role-badge")
    ITEMS_MENU = (By.CSS_SELECTOR, ".sidebar-nav .nav-item")
    BTN_SALIR = (By.CSS_SELECTOR, ".btn-logout")

    def __init__(self, driver, timeout=45):
        self.driver = driver
        self.espera = WebDriverWait(driver, timeout)

    def rol_activo(self):
        return self.espera.until(EC.visibility_of_element_located(self.ROL)).text.strip()

    def menu(self):
        self.espera.until(EC.visibility_of_element_located(self.ITEMS_MENU))
        return [e.text.strip() for e in self.driver.find_elements(*self.ITEMS_MENU)]

    def ir_a(self, etiqueta):
        xp = f"//nav[contains(@class,'sidebar-nav')]//a[contains(@class,'nav-item')][contains(., '{etiqueta}')]"
        self.espera.until(EC.element_to_be_clickable((By.XPATH, xp))).click()
        return self

    def clic_boton(self, texto):
        xp = f"//button[contains(., '{texto}')]"
        self.espera.until(EC.element_to_be_clickable((By.XPATH, xp))).click()
        return self

    def toast(self, texto):
        """Los toasts son <div> con position:fixed colgados directamente del body."""
        xp = f"//body/div[contains(@style,'fixed')][contains(., \"{texto}\")]"
        return self.espera.until(EC.visibility_of_element_located((By.XPATH, xp))).text

    def validez(self, id_input, propiedad):
        """Lee una propiedad de validación HTML5 (valueMissing, rangeUnderflow, patternMismatch...)."""
        el = self.espera.until(EC.presence_of_element_located((By.ID, id_input)))
        return self.driver.execute_script(f"return arguments[0].validity.{propiedad};", el)

    def escribir(self, id_input, valor):
        el = self.espera.until(EC.visibility_of_element_located((By.ID, id_input)))
        el.clear()
        el.send_keys(valor)

    def cerrar_sesion(self):
        self.espera.until(EC.element_to_be_clickable(self.BTN_SALIR)).click()

    # ---- helpers para las pruebas por módulo ----
    def js(self, script, *args):
        return self.driver.execute_script(script, *args)

    def fijar(self, id_input, valor):
        """Fija el valor por JS y dispara input/change (útil en <input type=date>)."""
        el = self.espera.until(EC.presence_of_element_located((By.ID, id_input)))
        self.js("arguments[0].value = arguments[1];"
                "arguments[0].dispatchEvent(new Event('input', {bubbles: true}));"
                "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));", el, valor)

    def valor(self, id_input):
        el = self.espera.until(EC.presence_of_element_located((By.ID, id_input)))
        return el.get_attribute("value")

    def formulario_valido(self, id_input):
        el = self.espera.until(EC.presence_of_element_located((By.ID, id_input)))
        return self.js("return arguments[0].form.checkValidity();", el)

    def enviar_formulario(self):
        sel = (By.CSS_SELECTOR, ".modal-overlay.open button[type='submit']")
        self.espera.until(EC.element_to_be_clickable(sel)).click()

    def hay_texto(self, texto):
        return self.espera.until(EC.text_to_be_present_in_element((By.TAG_NAME, "body"), texto))

    def texto_de(self, css):
        return self.espera.until(EC.visibility_of_element_located((By.CSS_SELECTOR, css))).text

    def filas(self, css_filas):
        self.espera.until(EC.presence_of_element_located((By.CSS_SELECTOR, css_filas)))
        return [[td.text.strip() for td in tr.find_elements(By.TAG_NAME, "td")]
                for tr in self.driver.find_elements(By.CSS_SELECTOR, css_filas)]

    def existe(self, css):
        return bool(self.driver.find_elements(By.CSS_SELECTOR, css))


def soles(texto):
    return float(texto.replace("S/", "").replace(",", "").strip())
