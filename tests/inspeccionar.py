"""inspeccionar.py — abre MINISO y muestra los selectores reales de la pantalla de login.

Uso:  python inspeccionar.py
Copia lo que imprime en la terminal y úsalo para completar el diccionario SEL
de test_tc10_autenticacion.py (o pégamelo en el chat y te lo ajusto).
"""
import time

from selenium import webdriver
from selenium.webdriver.common.by import By

URL = "https://miniso-web-omega.vercel.app"

d = webdriver.Chrome()
d.maximize_window()
d.get(URL)
print("Esperando 40 s a que cargue la página (el backend gratuito puede tardar)...")
time.sleep(40)

print("\nURL actual:", d.current_url)
print("Título:", d.title)

print("\n--- CAMPOS (input) ---")
for e in d.find_elements(By.TAG_NAME, "input"):
    print(f"id={e.get_attribute('id')!r}  name={e.get_attribute('name')!r}  "
          f"type={e.get_attribute('type')!r}  placeholder={e.get_attribute('placeholder')!r}")

print("\n--- BOTONES ---")
for e in d.find_elements(By.TAG_NAME, "button"):
    print(f"id={e.get_attribute('id')!r}  type={e.get_attribute('type')!r}  texto={e.text!r}")

print("\n--- ENLACES ---")
for e in d.find_elements(By.TAG_NAME, "a"):
    print(f"texto={e.text!r}  href={e.get_attribute('href')!r}")

print("\n--- FRAMES (si hay, los campos pueden estar dentro de un iframe) ---")
print(len(d.find_elements(By.TAG_NAME, "iframe")), "iframe(s)")

input("\nPresiona Enter para cerrar el navegador...")
d.quit()
