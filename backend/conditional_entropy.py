"""Полные и частные условные энтропии для двух зависимых систем X и Y."""

from __future__ import annotations

import json
import math
import re
from typing import Any

EPS = 1e-12
SUM_TOL = 1e-6


def _entropy(probs: list[float]) -> float:
    total = 0.0
    for p in probs:
        if p > EPS:
            total -= p * math.log2(p)
    return total


def _parse_matrix(raw: str | list[list[float]]) -> list[list[float]]:
    if isinstance(raw, list):
        matrix = raw
    else:
        text = raw.strip()
        if not text:
            raise ValueError("Введите матрицу вероятностей")
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                matrix = parsed
            else:
                raise ValueError("JSON должен быть двумерным массивом")
        except json.JSONDecodeError:
            rows: list[list[float]] = []
            for line in text.splitlines():
                line = line.strip()
                if not line:
                    continue
                parts = re.split(r"[\s;,]+", line)
                rows.append([float(p.replace(",", ".")) for p in parts if p])
            matrix = rows

    if not matrix or not all(isinstance(row, list) and row for row in matrix):
        raise ValueError("Матрица должна быть непустой таблицей чисел")

    width = len(matrix[0])
    if width == 0:
        raise ValueError("Пустые строки матрицы")

    result: list[list[float]] = []
    for i, row in enumerate(matrix):
        if len(row) != width:
            raise ValueError(f"Строка {i + 1}: ожидается {width} столбцов, получено {len(row)}")
        parsed_row: list[float] = []
        for j, cell in enumerate(row):
            try:
                val = float(cell)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"Ячейка ({i + 1},{j + 1}): не число") from exc
            if val < -EPS:
                raise ValueError(f"Ячейка ({i + 1},{j + 1}): отрицательная вероятность")
            parsed_row.append(max(0.0, val))
        result.append(parsed_row)

    return result


def _default_labels(prefix: str, count: int) -> list[str]:
    return [f"{prefix}{i + 1}" for i in range(count)]


def compute_conditional_entropies(
    matrix_raw: str | list[list[float]],
    labels_x: list[str] | None = None,
    labels_y: list[str] | None = None,
) -> dict[str, Any]:
    """
    joint[i][j] = P(X=x_i, Y=y_j)
    Возвращает полные H(X|Y), H(Y|X) и частные по каждому состоянию.
    """
    joint = _parse_matrix(matrix_raw)
    rows = len(joint)
    cols = len(joint[0])

    total = sum(joint[i][j] for i in range(rows) for j in range(cols))
    if total <= EPS:
        raise ValueError("Сумма вероятностей должна быть больше нуля")

    normalized = [[joint[i][j] / total for j in range(cols)] for i in range(rows)]
    if abs(total - 1.0) > SUM_TOL:
        note = (
            f"Сумма входных вероятностей {total:.6f} ≠ 1; "
            "матрица нормализована автоматически."
        )
    else:
        note = ""

    lx = labels_x if labels_x and len(labels_x) == rows else _default_labels("x", rows)
    ly = labels_y if labels_y and len(labels_y) == cols else _default_labels("y", cols)

    px = [sum(normalized[i][j] for j in range(cols)) for i in range(rows)]
    py = [sum(normalized[i][j] for i in range(rows)) for j in range(cols)]

    hxy = _entropy([normalized[i][j] for i in range(rows) for j in range(cols)])
    hx = _entropy(px)
    hy = _entropy(py)

    hx_given_y = hxy - hy
    hy_given_x = hxy - hx

    partial_x_given_y: list[dict[str, Any]] = []
    for j in range(cols):
        if py[j] <= EPS:
            cond = 0.0
            dist: list[dict[str, float]] = []
        else:
            cond_probs = [normalized[i][j] / py[j] for i in range(rows)]
            cond = _entropy(cond_probs)
            dist = [
                {"label": lx[i], "p": round(cond_probs[i], 8)}
                for i in range(rows)
                if cond_probs[i] > EPS
            ]
        partial_x_given_y.append(
            {
                "given": ly[j],
                "pY": round(py[j], 8),
                "h": round(cond, 6),
                "distribution": dist,
            }
        )

    partial_y_given_x: list[dict[str, Any]] = []
    for i in range(rows):
        if px[i] <= EPS:
            cond = 0.0
            dist = []
        else:
            cond_probs = [normalized[i][j] / px[i] for j in range(cols)]
            cond = _entropy(cond_probs)
            dist = [
                {"label": ly[j], "p": round(cond_probs[j], 8)}
                for j in range(cols)
                if cond_probs[j] > EPS
            ]
        partial_y_given_x.append(
            {
                "given": lx[i],
                "pX": round(px[i], 8),
                "h": round(cond, 6),
                "distribution": dist,
            }
        )

    return {
        "labelsX": lx,
        "labelsY": ly,
        "joint": [[round(normalized[i][j], 8) for j in range(cols)] for i in range(rows)],
        "marginalX": [round(p, 8) for p in px],
        "marginalY": [round(p, 8) for p in py],
        "entropy": {
            "H_X": round(hx, 6),
            "H_Y": round(hy, 6),
            "H_XY": round(hxy, 6),
            "H_X_given_Y": round(hx_given_y, 6),
            "H_Y_given_X": round(hy_given_x, 6),
            "I_XY": round(hx + hy - hxy, 6),
        },
        "partial": {
            "H_X_given_Y_equals": partial_x_given_y,
            "H_Y_given_X_equals": partial_y_given_x,
        },
        "note": note,
        "units": "бит",
    }
