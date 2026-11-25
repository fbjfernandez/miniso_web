# -*- coding: utf-8 -*-
"""Carga qa_evidencias/casos_kiwi.csv en Kiwi TCMS mediante la API RPC.

Uso:
    venv\\Scripts\\python.exe qa_evidencias\\importar_a_kiwi.py

Requiere qa_evidencias/.kiwi.env con KIWI_URL, KIWI_USER y KIWI_PASSWORD.
El resto de valores tienen por defecto los de la ejecución auditada.

Mapeo de estados:
    PASÓ    -> TestExecutionStatus "PASSED"
    OMITIDO -> TestExecutionStatus "WAIVED" + comentario de salvaguarda
"""
import csv
import os
import sys
from datetime import datetime

from tcms_api import TCMS

BASE = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE, ".kiwi.env")
CSV_PATH = os.path.join(BASE, "casos_kiwi.csv")

DEFAULTS = {
    "KIWI_PLAN_ID": "16827",
    "KIWI_RUN_SUMMARY": "Ejecución Suite Selenium E2E - Commit 3355926 (Vercel)",
    "KIWI_BUILD": "build-2.0.0-3355926",
    "KIWI_PRODUCT": "MINISO Web POS",
    "KIWI_VERSION": "2.0.0",
    "KIWI_MANAGER": "admin01",
    "KIWI_CATEGORY": "Suite Selenium E2E",
    "KIWI_PRIORITY": "Normal",
    "KIWI_CASE_STATUS": "CONFIRMED",
    "KIWI_WAIVED_COMMENT": (
        "Omitido de forma controlada por salvaguarda de integridad de BD "
        "en producción / precondición de estado"
    ),
}


def load_config(path):
    cfg = dict(DEFAULTS)
    with open(path, encoding="utf-8-sig") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            cfg[key.strip()] = value.strip()
    return cfg


def first(rows, what):
    if not rows:
        raise RuntimeError("No se encontró: %s" % what)
    return rows[0]


def get_or_create(rpc, model, query, values, what):
    rows = rpc.__getattr__(model).filter(query)
    if rows:
        return rows[0]["id"], False
    created = rpc.__getattr__(model).create(values)
    return created["id"], True


def kiwi_date(raw):
    """Convierte un timestamp ISO del XML/CSV al formato Django esperado."""
    if not raw:
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return raw.replace("T", " ")[:19]


def status_id_by_name(rpc, model, name, fallback_lookup=None):
    try:
        return first(rpc.__getattr__(model).filter({"name": name}), name)["id"]
    except RuntimeError:
        if not fallback_lookup:
            raise
        return first(rpc.__getattr__(model).filter(fallback_lookup), name)["id"]


def execution_status_id(rpc, name, weight):
    """Devuelve el ID del estado; si no existe en la instancia lo crea."""
    found = rpc.TestExecutionStatus.filter({"name": name})
    if found:
        return found[0]["id"]
    created = rpc.TestExecutionStatus.create(
        {
            "name": name,
            "weight": weight,
            "icon": "fa fa-ban",
            "color": "#0dbf00",
        }
    )
    print("Estado de ejecución creado: %s (weight=%s)" % (name, weight))
    return created["id"]


def main():
    cfg = load_config(ENV_PATH)

    url = cfg.get("KIWI_URL", "")
    username = cfg.get("KIWI_USER", "")
    password = cfg.get("KIWI_PASSWORD", "")
    if not url or not username or not password:
        sys.exit(
            "Faltan KIWI_URL, KIWI_USER o KIWI_PASSWORD en "
            "qa_evidencias/.kiwi.env — rellénalos antes de ejecutar."
        )

    rpc = TCMS(url, username, password).exec

    # --- Contenedores de destino -------------------------------------------------
    plan_id = int(cfg["KIWI_PLAN_ID"])
    plan = first(rpc.TestPlan.filter({"pk": plan_id}), "plan %s" % plan_id)
    product_id = plan["product"]
    manager_id = plan.get("author") or None
    if cfg["KIWI_MANAGER"]:
        try:
            users = rpc.User.filter({"username": cfg["KIWI_MANAGER"]})
            if users:
                manager_id = users[0]["id"]
        except Exception as exc:  # permisos insuficientes: se usa el autor del plan
            print("No se pudo resolver KIWI_MANAGER (%s); se usa author=%s" % (exc, manager_id))

    # Version usa el campo "value" (no "name") en la API RPC.
    versions = rpc.Version.filter(
        {"value": cfg["KIWI_VERSION"], "product": product_id}
    )
    if versions:
        version_id = versions[0]["id"]
    else:
        version_id = rpc.Version.create(
            {"value": cfg["KIWI_VERSION"], "product": product_id}
        )["id"]
        print("Versión creada: %s" % cfg["KIWI_VERSION"])

    categories = rpc.Category.filter(
        {"name": cfg["KIWI_CATEGORY"], "product": product_id}
    )
    if categories:
        category_id = categories[0]["id"]
    else:
        category_id = rpc.Category.create(
            {"name": cfg["KIWI_CATEGORY"], "product": product_id}
        )["id"]
        print("Categoría creada: %s" % cfg["KIWI_CATEGORY"])

    # Build.filter no acepta product junto con name en esta instancia.
    builds = [
        b
        for b in rpc.Build.filter({"name": cfg["KIWI_BUILD"]})
        if b.get("version") == version_id
    ]
    if builds:
        build_id = builds[0]["id"]
    else:
        build_id = rpc.Build.create(
            {
                "name": cfg["KIWI_BUILD"],
                "product": product_id,
                "version": version_id,
            }
        )["id"]
        print("Build creado: %s" % cfg["KIWI_BUILD"])

    priorities = rpc.Priority.filter({"value": cfg["KIWI_PRIORITY"]})
    priority_id = priorities[0]["id"] if priorities else rpc.Priority.filter({})[0]["id"]

    case_status_id = status_id_by_name(
        rpc,
        "TestCaseStatus",
        cfg["KIWI_CASE_STATUS"],
        {"is_confirmed": True},
    )
    passed_id = execution_status_id(rpc, "PASSED", 40)
    waived_id = execution_status_id(rpc, "WAIVED", 40)

    print(
        "plan=%s product=%s version=%s build=%s category=%s priority=%s "
        "case_status=%s PASSED=%s WAIVED=%s"
        % (
            plan_id,
            product_id,
            version_id,
            build_id,
            category_id,
            priority_id,
            case_status_id,
            passed_id,
            waived_id,
        )
    )

    # --- Test Run (reutilizable en reintentos) ----------------------------------
    runs = rpc.TestRun.filter(
        {"summary": cfg["KIWI_RUN_SUMMARY"], "plan": plan_id}
    )
    if runs:
        run_id = runs[0]["id"]
        print("Test Run existente reutilizado: %s" % run_id)
    else:
        run_values = {
            "summary": cfg["KIWI_RUN_SUMMARY"],
            "plan": plan_id,
            "build": build_id,
        }
        if manager_id:
            run_values["manager"] = manager_id
        run = rpc.TestRun.create(run_values)
        run_id = run["id"]
        print("Test Run creado: %s" % run_id)

    # --- Casos ------------------------------------------------------------------
    with open(CSV_PATH, newline="", encoding="utf-8-sig") as handle:
        casos = list(csv.DictReader(handle))

    stats = {"creados": 0, "reutilizados": 0, "PASSED": 0, "WAIVED": 0, "planes": 0}

    for row in casos:
        case_id = row["Case ID"].strip()
        summary = "%s — %s" % (case_id, row["Título"].strip())
        detalle = (
            "**Módulo/HU:** %s\n\n"
            "**Tipo:** %s\n\n"
            "**Validaciones reales:** %s\n\n"
            "**Motivo de omisión (si aplica):** %s\n\n"
            "**Evidencia:** %s"
            % (
                row["Módulo/HU"].strip(),
                row["Tipo"].strip(),
                row["Validaciones reales"].strip(),
                row["Motivo"].strip() or "—",
                row["Evidencia"].strip() or "—",
            )
        )

        existentes = rpc.TestCase.filter(
            {"summary": summary, "category__product": product_id}
        )
        if existentes:
            case = existentes[0]
            stats["reutilizados"] += 1
        else:
            case = rpc.TestCase.create(
                {
                    "summary": summary,
                    "category": category_id,
                    "priority": priority_id,
                    "case_status": case_status_id,
                    "text": detalle,
                    "is_automated": True,
                }
            )
            stats["creados"] += 1
        tc_id = case["id"]

        ya_en_plan = rpc.TestCase.filter({"pk": tc_id, "plan": plan_id})
        if not ya_en_plan:
            rpc.TestPlan.add_case(plan_id, tc_id)
            stats["planes"] += 1

        ejecuciones = rpc.TestRun.add_case(run_id, tc_id)
        ejecucion = first(ejecuciones, "ejecución de %s" % case_id)

        resultado = row["Resultado"].strip()
        if resultado == "PASÓ":
            status = passed_id
            stats["PASSED"] += 1
            comment = None
        elif resultado == "OMITIDO":
            status = waived_id
            stats["WAIVED"] += 1
            comment = cfg["KIWI_WAIVED_COMMENT"]
        else:
            raise RuntimeError("Resultado desconocido en %s: %s" % (case_id, resultado))

        fecha = kiwi_date(row["Fecha ejecución"].strip())
        rpc.TestExecution.update(
            ejecucion["id"],
            {"status": status, "start_date": fecha, "stop_date": fecha},
        )
        if comment:
            rpc.TestExecution.add_comment(ejecucion["id"], comment)

    rpc.TestRun.update(run_id, {"stop_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")})

    print(
        "FINAL: run=%s casos=%s creados=%s reutilizados=%s añadidos_al_plan=%s "
        "PASSED=%s WAIVED=%s"
        % (
            run_id,
            len(casos),
            stats["creados"],
            stats["reutilizados"],
            stats["planes"],
            stats["PASSED"],
            stats["WAIVED"],
        )
    )


if __name__ == "__main__":
    main()
