import os
import sys
import pytest
from selenium import webdriver

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from paginas.login_page import LoginPage
from paginas.app_page import AppPage

# Producción: https://miniso-web-omega.vercel.app/   |   Local: http://127.0.0.1:5500/frontend/
URL = os.getenv("MINISO_URL", "https://miniso-web-omega.vercel.app/")
CLAVE = os.getenv("MINISO_CLAVE", "1234")
USUARIOS = {"Cajero": "cajero01", "Administrador": "admin01", "Almacenero": "almacen01"}

solo_destructiva = pytest.mark.skipif(
    os.getenv("RUN_DESTRUCTIVE") != "1",
    reason="Modifica datos reales. Activa con RUN_DESTRUCTIVE=1",
)


@pytest.fixture
def driver(request):
    op = webdriver.ChromeOptions()
    op.add_argument("--window-size=1400,900")
    if os.getenv("HEADLESS") == "1":
        op.add_argument("--headless=new")
    d = webdriver.Chrome(options=op)
    yield d
    rep = getattr(request.node, "rep_call", None)
    if rep is not None and rep.failed:  # captura automática al fallar
        os.makedirs("evidencias", exist_ok=True)
        d.save_screenshot(f"evidencias/FALLO_{request.node.name}.png")
    d.quit()


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    setattr(item, f"rep_{outcome.get_result().when}", outcome.get_result())


@pytest.fixture
def entrar(driver):
    """entrar('Cajero') -> abre el sistema, inicia sesión y devuelve AppPage."""
    def _entrar(rol):
        LoginPage(driver, URL).abrir().iniciar_sesion(USUARIOS[rol], CLAVE)
        app = AppPage(driver)
        assert app.rol_activo().upper() == rol.upper()
        return app
    return _entrar
