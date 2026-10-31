"""conftest.py — infraestructura común para ejecutar y registrar los casos del TC10.

Convención: cada test se llama test_tc_f_0XX_descripcion  ->  caso TC-F-0XX.
Por cada test se guarda:
  - evidencias/TC-F-0XX_evidencia_01.png  (captura al terminar el test)
  - una fila en resultados_tc10.csv        (PASÓ / FALLÓ / Bloqueado)
"""
import csv
import datetime
import os
import re

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

CARPETA_EVIDENCIAS = "evidencias"
ARCHIVO_RESULTADOS = "resultados_tc10.csv"
os.makedirs(CARPETA_EVIDENCIAS, exist_ok=True)


@pytest.fixture
def driver():
    opciones = Options()
    # opciones.add_argument("--headless=new")  # descomentar para correr sin ventana
    d = webdriver.Chrome(options=opciones)  # Selenium 4.6+ descarga el driver solo
    d.maximize_window()
    d.implicitly_wait(0)  # usamos esperas explícitas
    yield d
    d.quit()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    resultado = yield
    rep = resultado.get_result()
    if rep.when != "call":
        return

    m = re.search(r"tc_f_(\d{3})", item.name)
    if not m:
        return
    caso = f"TC-F-{m.group(1)}"

    # Evidencia: captura con el ID del caso en el nombre
    d = item.funcargs.get("driver")
    if d is not None:
        try:
            d.save_screenshot(f"{CARPETA_EVIDENCIAS}/{caso}_evidencia_01.png")
        except Exception:
            pass

    if rep.passed:
        estado, obs = "PASÓ", ""
    elif rep.skipped:
        estado = "Bloqueado"
        obs = str(rep.longrepr[-1]) if rep.longrepr else "Omitido"
    else:
        estado = "FALLÓ"
        obs = str(rep.longrepr).strip().splitlines()[-1][:200]

    nuevo = not os.path.exists(ARCHIVO_RESULTADOS)
    with open(ARCHIVO_RESULTADOS, "a", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        if nuevo:
            w.writerow(["caso", "resultado", "fecha", "observacion"])
        w.writerow([caso, estado, datetime.datetime.now().strftime("%d/%m/%Y %H:%M"), obs])
