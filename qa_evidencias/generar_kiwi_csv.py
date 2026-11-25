"""Genera qa_evidencias/casos_kiwi.csv desde el JUnit XML real de la ejecución.

No modifica código ni pruebas: solo cruza el resultado real del XML con la
trazabilidad leída de los propios archivos de test.
"""
import csv
import os
import xml.etree.ElementTree as ET

BASE = os.path.dirname(os.path.abspath(__file__))
XML = os.path.join(BASE, "pytest_results_20261124_214347.xml")
SALIDA = os.path.join(BASE, "casos_kiwi.csv")

# nombre del test -> (ID caso, módulo/HU, título, tipo, validaciones reales)
MAPA = {
    "test_acceso_cajero_exitoso": ("TC8-01", "Flujo principal / HU-01", "Acceso Cajero exitoso", "Positivo", "Login con cajero01 y verificación del rol activo CAJERO; guarda TC8_Evidencia.png"),
    "test_login_valido_por_rol": ("HU01-01", "HU-01 Login", "Login válido por rol (parametrizado)", "Positivo", "Ingresa con Cajero/Administrador/Almacenero y valida que el rol activo coincide"),
    "test_login_usuario_inexistente": ("HU01-02", "HU-01 Login", "Usuario inexistente", "Negativo", "Muestra 'Credenciales inválidas' con usuario noexiste99"),
    "test_login_campos_vacios_no_envia": ("HU01-03", "HU-01 Login", "Campos vacíos no envía", "Negativo", "Validación HTML nativa: validationMessage no vacío, sin error de app ni rol activo"),
    "test_cerrar_sesion": ("HU01-04", "HU-02 Cierre de sesión", "Cerrar sesión", "Positivo", "Tras logout vuelve a hacerse visible el formulario de login"),
    "test_sesion_sobrevive_a_recargar": ("HU01-05", "HU-01 Login", "Sesión sobrevive a recargar", "Positivo", "Recarga la página y el rol Administrador permanece activo"),
    "test_bloqueo_tras_5_intentos": ("HU08-01", "HU-08 Anti-fuerza bruta", "Bloqueo tras 5 intentos", "Seguridad", "5 claves incorrectas con cuenta desechable; el 5.º mensaje indica 'bloqueado'; desbloquea y elimina la cuenta"),
    "test_m01_feliz_venta_completa_descuenta_stock": ("M01-01", "M01 Registrar Venta", "Venta completa descuenta stock", "Positivo", "Selecciona cliente y producto, confirma venta, verifica comprobante y stock -1; rollback de venta/stock/puntos/control"),
    "test_m01_borde_no_se_vende_mas_que_el_stock": ("M01-02", "M01 Registrar Venta", "No vender más que el stock", "Límite", "Clics por encima del stock; valida toast 'No hay más stock disponible' y cantidad = stock"),
    "test_m01_error_confirmar_sin_cliente": ("M01-03", "M01 Registrar Venta", "Confirmar sin cliente", "Negativo", "Confirma sin seleccionar cliente y valida mensaje que exige cliente"),
    "test_m02_feliz_registrar_cliente": ("M02-01", "M02 Clientes", "Registrar cliente", "Positivo", "Registra cliente con DNI de 8 dígitos, valida toast y fila en tabla; elimina el cliente al final"),
    "test_m02_borde_dni_se_corta_en_8_digitos": ("M02-02", "M02 Clientes", "DNI se corta en 8 dígitos", "Límite", "Escribe 13 dígitos y valida que el campo queda en 8"),
    "test_m02_error_dni_de_5_digitos_lo_rechaza_el_servidor": ("M02-03", "M02 Clientes", "DNI de 5 dígitos rechazado", "Negativo", "El servidor responde 'El DNI debe tener 8 dígitos'"),
    "test_m03_feliz_devolucion_total": ("M03-01", "M03 Devoluciones", "Devolución total", "Positivo", "Crea venta de prueba, busca por comprobante, elige motivo y confirma; limpia venta y devolución"),
    "test_m03_borde_busqueda_sin_resultados": ("M03-02", "M03 Devoluciones", "Búsqueda sin resultados", "Límite", "Busca comprobante inexistente y valida 'Sin resultados'"),
    "test_m03_error_confirmar_sin_motivo": ("M03-03", "M03 Devoluciones", "Confirmar sin motivo", "Negativo", "Confirma sin seleccionar motivo y valida 'Selecciona un motivo para la devolución'"),
    "test_m04_feliz_crear_producto": ("M04-01", "M04 Productos", "Crear producto", "Positivo", "Completa formulario, proveedor, valida registro y fila; elimina el producto al final"),
    "test_m04_borde_limites_de_precio_y_stock": ("M04-02", "M04 Productos", "Límites de precio y stock", "Límite", "rangeUnderflow en precio -0.01 y stock 0; stepMismatch en stock 1.5"),
    "test_m04_error_formulario_vacio_es_invalido": ("M04-03", "M04 Productos", "Formulario vacío inválido", "Negativo", "valueMissing en nombre y proveedor; formulario inválido"),
    "test_m05_feliz_crear_proveedor": ("M05-01", "M05 Proveedores", "Crear proveedor", "Positivo", "Registra proveedor con RUC de 11 dígitos, valida toast y fila; lo elimina al final"),
    "test_m05_borde_ruc_de_10_11_y_13_digitos": ("M05-02", "M05 Proveedores", "RUC 10/11/13 dígitos", "Límite", "patternMismatch con 10, válido con 11 y recorte a 11 con 13"),
    "test_m05_error_ruc_con_letras_y_email_invalido": ("M05-03", "M05 Proveedores", "RUC con letras y email inválido", "Negativo", "patternMismatch en RUC, typeMismatch en email, formulario inválido"),
    "test_m06_feliz_generar_orden": ("M06-01", "M06 Órdenes de compra", "Generar orden de compra", "Positivo", "Elige proveedor y producto, graba orden, valida toast; elimina la orden creada"),
    "test_m06_borde_quitar_la_unica_unidad_vacia_el_carrito": ("M06-02", "M06 Órdenes de compra", "Quitar única unidad vacía carrito", "Límite", "Quita la única unidad y valida 'Agrega productos a la orden' y total 0.00"),
    "test_m06_error_grabar_sin_proveedor": ("M06-03", "M06 Órdenes de compra", "Grabar sin proveedor", "Negativo", "Valida 'Selecciona un proveedor para la orden'"),
    "test_m07_feliz_muestra_totales_y_detalle": ("M07-01", "M07 Reporte de Ventas", "Muestra totales y detalle", "Positivo", "Presenta 'Total vendido en el período' y 'Detalle de ventas (' sin alerta de error"),
    "test_m07_borde_periodo_sin_ventas": ("M07-02", "M07 Reporte de Ventas", "Período sin ventas", "Límite", "Rango 2000-01-01 muestra 'Sin ventas en este período' y exportar avisa que no hay ventas"),
    "test_m07_error_fecha_inicio_mayor_que_fin": ("M07-03", "M07 Reporte de Ventas", "Fecha inicio mayor que fin", "Negativo", "Valida mensaje 'no puede ser mayor'"),
    "test_m08_feliz_crear_usuario": ("M08-01", "M08 Usuarios y roles", "Crear usuario", "Positivo", "Crea usuario QA, valida toast y fila; elimina la cuenta al final"),
    "test_m08_borde_clave_de_3_caracteres": ("M08-02", "M08 Usuarios y roles", "Clave de 3 caracteres", "Límite", "El servidor exige 'al menos 4 caracteres'"),
    "test_m08_error_usuario_duplicado": ("M08-03", "M08 Usuarios y roles", "Usuario duplicado", "Negativo", "Intenta crear admin01 y valida mensaje 'ya existe'"),
    "test_m09_feliz_confirmar_entrada": ("M09-01", "M09 Registrar Entrada", "Confirmar entrada", "Positivo", "Crea orden de prueba, recibe y confirma entrada, valida toast; elimina entrada y orden"),
    "test_m09_borde_cantidad_entre_1_y_lo_pedido": ("M09-02", "M09 Registrar Entrada", "Cantidad entre 1 y lo pedido", "Límite", "Excede el máximo y baja de 1; valida tope = pedida y mínimo = 1"),
    "test_m09_error_confirmar_sin_productos": ("M09-03", "M09 Registrar Entrada", "Confirmar sin productos", "Negativo", "Quita todos los productos y valida 'Agrega al menos un producto recibido'"),
    "test_m10_feliz_lista_solo_productos_en_o_bajo_el_minimo": ("M10-01", "M10 Productos Agotados", "Lista solo productos en/bajo mínimo", "Positivo", "Valida encabezado y que cada fila tenga stock <= mínimo"),
    "test_m10_borde_sin_productos_muestra_mensaje_vacio": ("M10-02", "M10 Productos Agotados", "Sin productos agotados", "Límite", "Fuerza DB.productos=[] y valida mensaje vacío sin alerta"),
    "test_m10_error_token_vencido_cierra_sesion": ("M10-03", "M10 Productos Agotados", "Token vencido cierra sesión", "Seguridad", "Sustituye el JWT por 'token-invalido', recarga y valida 'sesión expiró' y vuelta al login"),
    "test_m11_feliz_valor_total_coincide_con_la_tabla": ("M11-01", "M11 Reporte de Inventario", "Valor total coincide con tabla", "Positivo", "Suma el valor de las filas y lo compara con el indicador; compara conteo de productos"),
    "test_m11_borde_catalogo_vacio_muestra_ceros": ("M11-02", "M11 Reporte de Inventario", "Catálogo vacío muestra ceros", "Límite", "Fuerza DB.productos=[] y valida 'S/ 0.00' y '0'"),
    "test_m11_error_exportar_con_catalogo_vacio": ("M11-03", "M11 Reporte de Inventario", "Exportar con catálogo vacío", "Negativo", "Fuerza catálogo vacío y valida 'No hay productos para exportar'"),
    "test_menu_segun_rol": ("HU07-01", "HU-07 RBAC / menú", "Menú según rol (parametrizado)", "Seguridad", "Valida items visibles y ocultos para Cajero, Administrador y Almacenero"),
    "test_api_devuelve_403_al_cajero_en_usuarios": ("HU07-02", "HU-07 RBAC / API", "API devuelve 403 al Cajero en usuarios", "Seguridad", "fetch autenticado a /usuarios desde sesión Cajero y valida HTTP 403"),
    "test_tc_f_001_login_valido_cajero": ("TC-F-001", "TC-F / HU-01", "Login válido Cajero", "Positivo", "Login y valida texto CAJERO y ausencia del formulario"),
    "test_tc_f_002_clave_incorrecta_se_rechaza": ("TC-F-002", "TC-F / HU-01", "Clave incorrecta rechazada", "Negativo", "Valida 'Credenciales inválidas' y hace login correcto para reiniciar contador"),
    "test_tc_f_003_campos_vacios_no_envian_post": ("TC-F-003", "TC-F / HU-01", "Campos vacíos no envían POST", "Negativo", "Cuenta recursos /api/login antes y después; valida que no aumentan"),
    "test_tc_f_004_flujo_cajero_llega_a_registrar_venta": ("TC-F-004", "TC-F / HU-01", "Flujo Cajero llega a Registrar Venta", "Positivo", "Tras login, el enlace 'Registrar Venta' está visible y se puede pulsar"),
    "test_tc_f_005_cerrar_sesion": ("TC-F-005", "TC-F / HU-02", "Cerrar sesión", "Positivo", "Pulsa logout y valida que reaparece el login"),
    "test_tc_f_006_atras_tras_logout_no_muestra_contenido_interno": ("TC-F-006", "TC-F / HU-02", "Atrás tras logout", "Seguridad", "Valida sessionStorage borrado y que al volver atrás no hay sidebar interno"),
    "test_tc_f_007_logout_sin_sesion_no_da_error": ("TC-F-007", "TC-F / HU-02", "Logout sin sesión", "Negativo", "Limpia almacenamiento, recarga y valida login sin error"),
    "test_tc_f_011_menu_cajero": ("TC-F-011", "TC-F / HU-06", "Menú Cajero", "Seguridad", "Compara el conjunto exacto de 4 items del menú Cajero"),
    "test_tc_f_012_menu_almacenero": ("TC-F-012", "TC-F / HU-06", "Menú Almacenero", "Seguridad", "Compara el conjunto exacto de 4 items del menú Almacenero"),
    "test_tc_f_014_admin_accede_a_endpoint_protegido": ("TC-F-014", "TC-F / HU-07", "Admin accede a endpoint protegido", "Seguridad", "GET /usuarios con JWT de admin01 → HTTP 200"),
    "test_tc_f_015_cajero_recibe_403_en_endpoint_de_admin": ("TC-F-015", "TC-F / HU-07", "Cajero recibe 403", "Seguridad", "GET /usuarios con JWT de cajero01 → HTTP 403"),
    "test_tc_f_016_sin_token_recibe_401": ("TC-F-016", "TC-F / HU-07", "Sin token recibe 401", "Seguridad", "GET /usuarios sin Authorization → HTTP 401"),
    "test_tc_f_017_header_x_user_role_falsificado_recibe_401": ("TC-F-017", "TC-F / HU-07", "Header x-user-role falsificado", "Seguridad", "GET /usuarios con x-user-role=Administrador sin JWT → HTTP 401"),
    "test_tc_f_020_cuenta_se_bloquea_a_los_5_intentos_y_se_desbloquea": ("TC-F-020", "TC-F / HU-08", "Bloqueo a los 5 intentos y desbloqueo", "Seguridad", "5 fallos → HTTP 403 'bloqueado'; clave correcta sigue rechazada; desbloquea en finally"),
}

tree = ET.parse(XML)
suite = tree.getroot().find("testsuite")
timestamp = suite.get("timestamp")

with open(SALIDA, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["Case ID", "Módulo/HU", "Título", "Tipo", "Prioridad", "Validaciones reales",
                "Resultado", "Motivo", "Fecha ejecución", "Evidencia"])
    for tc in suite.findall("testcase"):
        nombre = tc.get("name")
        base = nombre.split("[")[0]  # quita el sufijo paramétrico [Cajero], etc.
        caso, hu, titulo, tipo, validaciones = MAPA.get(
            base, (nombre, "Sin clasificar", nombre, "Funcional", ""))
        if "[" in nombre and base in MAPA:
            titulo = f"{titulo} ({nombre[nombre.find('[') + 1:-1]})"
            caso = f"{caso}-{nombre[nombre.find('[') + 1:-1]}"
        skipped = tc.find("skipped")
        failure = tc.find("failure")
        error = tc.find("error")
        if failure is not None or error is not None:
            resultado = "FALLÓ"
            motivo = (failure if failure is not None else error).get("message", "")
        elif skipped is not None:
            resultado = "OMITIDO"
            motivo = skipped.get("message", "")
        else:
            resultado = "PASÓ"
            motivo = ""
        evidencia = ""
        if caso.startswith("TC-F-") and resultado != "OMITIDO":
            evidencia = f"evidencias/{caso}_evidencia_01.png"
        elif caso == "TC8-01":
            evidencia = "TC8_Evidencia.png"
        w.writerow([caso, hu, titulo, tipo, "Media", validaciones,
                    resultado, motivo, timestamp, evidencia])

print(f"Generado {SALIDA}")
