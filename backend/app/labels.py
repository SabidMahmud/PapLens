"""
Class label mapping (single source of truth).
"""
from typing import Literal

ModelType = Literal["triage", "severity"]

# 2-Class Clinical Triage (2Class_Triage)
TRIAGE_CLASSES: tuple[str, ...] = ("Normal", "Abnormal")

# 3-Class Severity Grading (3Class_Severity)
SEVERITY_CLASSES: tuple[str, ...] = ("Normal", "Low_Grade", "High_Grade")

MODEL_CLASSES: dict[ModelType, tuple[str, ...]] = {
    "triage": TRIAGE_CLASSES,
    "severity": SEVERITY_CLASSES,
}

# Human-readable labels for display
CLASS_DISPLAY_NAMES: dict[str, str] = {
    "Normal": "Normal (NILM)",
    "Abnormal": "Abnormal (Dysplastic / Malignant)",
    "Low_Grade": "Low-Grade Dysplasia (ASC-US / LSIL)",
    "High_Grade": "High-Grade Lesion / Malignancy (HSIL / SCC)",
}

# Clinical severity level for badge colors in UI
SEVERITY_LEVELS: dict[str, str] = {
    "Normal": "success",
    "Abnormal": "danger",
    "Low_Grade": "warning",
    "High_Grade": "danger",
}

# Bethesda classification reference mappings
BETHESDA_TO_TRIAGE: dict[str, str] = {
    "NILM": "Normal",
    "ASCUS": "Abnormal",
    "LSIL": "Abnormal",
    "HSIL": "Abnormal",
    "SCC": "Abnormal",
}

BETHESDA_TO_SEVERITY: dict[str, str] = {
    "NILM": "Normal",
    "ASCUS": "Low_Grade",
    "LSIL": "Low_Grade",
    "HSIL": "High_Grade",
    "SCC": "High_Grade",
}
