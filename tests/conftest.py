import csv
import datetime
import os
import re
import sys

import pytest
from selenium import webdriver

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from paginas.login_page import LoginPage
from paginas.app_page import AppPage

# Producción: https://miniso-web-omega.vercel.app/   |   Local: http://127.0.0.1:5500/
URL = os.getenv("MINISO_URL", "https://miniso-web-omega.vercel.app/")
CLAVE = os.getenv("MINISO_CLAVE", "1234")
USUARIOS = {"Cajero": "cajero01", "Administrador": "admin01", "Almacenero": "almacen01"}

RUTA_EVIDENCIAS = "evidencias"
RUTA_CSV = "resultados_tc10.csv"

def solo_destructiva(funcion):
    """Marca la prueba como destructiva y la omite salvo RUN_DESTRUCTIVE=1.

    Se aplica el marcador ``solo_destructiva`` (para poder ejecutar
    ``pytest -m solo_destructiva``) y además el ``skipif`` que protege al
    entorno cuando no se activa explícitamente.
    """
    funcion = pytest.mark.solo_destructiva(funcion)
    return pytest.mark.skipif(
        os.getenv("RUN_DESTRUCTIVE") != "1",
        reason="Modifica datos reales. Activa con RUN_DESTRUCTIVE=1",
    )(funcion)


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
        os.makedirs(RUTA_EVIDENCIAS, exist_ok=True)
        d.save_screenshot(f"{RUTA_EVIDENCIAS}/FALLO_{request.node.name}.png")
    d.quit()


def _caso_tc_f(nombre):
    m = re.search(r"test_tc_f_(\d{3})", nombre)
    return f"TC-F-{m.group(1)}" if m else None


def _normalizar_csv():
    """Convierte el CSV existente a UTF-8 y corrige el mojibake de ejecuciones viejas."""
    if not os.path.exists(RUTA_CSV):
        with open(RUTA_CSV, "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(["caso", "resultado", "fecha", "observacion"])
        return
    with open(RUTA_CSV, "rb") as f:
        raw = f.read()
    try:
        raw.decode("utf-8")
        return
    except UnicodeDecodeError:
        pass
    texto = raw.decode("latin-1")
    for malo, bueno in (("FALLÃ“", "FALLÓ"), ("PASÃ“", "PASÓ"), ("FALL�", "FALLÓ"), ("PAS�", "PASÓ")):
        texto = texto.replace(malo, bueno)
    with open(RUTA_CSV, "w", newline="", encoding="utf-8") as f:
        f.write(texto)


def _registrar_resultado(item, rep):
    caso = _caso_tc_f(item.name)
    if not caso:
        return
    os.makedirs(RUTA_EVIDENCIAS, exist_ok=True)
    elemento = item.funcargs.get("driver")
    if elemento is not None:
        try:
            elemento.save_screenshot(f"{RUTA_EVIDENCIAS}/{caso}_evidencia_01.png")
        except Exception:
            pass

    if rep.passed:
        resultado, observacion = "PASÓ", ""
    elif rep.skipped:
        resultado, observacion = "OMITIDO", str(rep.longrepr)
    else:
        resultado = "FALLÓ"
        lineas = (rep.longreprtext or "").strip().splitlines()
        observacion = lineas[-1] if lineas else "Error sin detalle"

    _normalizar_csv()
    with open(RUTA_CSV, "a", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow(
            [caso, resultado, datetime.datetime.now().strftime("%d/%m/%Y %H:%M"), observacion]
        )


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)
    if rep.when == "call":
        _registrar_resultado(item, rep)


@pytest.fixture
def entrar(driver):
    """entrar('Cajero') -> abre el sistema, inicia sesión y devuelve AppPage."""
    def _entrar(rol):
        LoginPage(driver, URL).abrir().iniciar_sesion(USUARIOS[rol], CLAVE)
        app = AppPage(driver)
        assert app.rol_activo().upper() == rol.upper()
        return app
    return _entrar
