"""
Class label mapping (single source of truth).
"""
from typing import Dict, List, Literal

ModelType = Literal["triage", "severity"]

# 2-Class Clinical Triage (2Class_Triage)
TRIAGE_CLASSES: List[str] = ["Normal", "Abnormal"]
TRIAGE_CLASS_TO_IDX: Dict[str, int] = {"Normal": 0, "Abnormal": 1}
TRIAGE_IDX_TO_CLASS: Dict[int, str] = {0: "Normal", 1: "Abnormal"}

# 3-Class Severity Grading (3Class_Severity)
SEVERITY_CLASSES: List[str] = ["Normal", "Low_Grade", "High_Grade"]
SEVERITY_CLASS_TO_IDX: Dict[str, int] = {"Normal": 0, "Low_Grade": 1, "High_Grade": 2}
SEVERITY_IDX_TO_CLASS: Dict[int, str] = {0: "Normal", 1: "Low_Grade", 2: "High_Grade"}

# Human-readable labels for display
CLASS_DISPLAY_NAMES: Dict[str, str] = {
    "Normal": "Normal (NILM)",
    "Abnormal": "Abnormal (Dysplastic / Malignant)",
    "Low_Grade": "Low-Grade Dysplasia (ASC-US / LSIL)",
    "High_Grade": "High-Grade Lesion / Malignancy (HSIL / SCC)",
}

# Clinical severity level for badge colors in UI
SEVERITY_LEVELS: Dict[str, str] = {
    "Normal": "success",
    "Abnormal": "danger",
    "Low_Grade": "warning",
    "High_Grade": "danger",
}

# Bethesda classification reference mappings
BETHESDA_TO_TRIAGE: Dict[str, str] = {
    "NILM": "Normal",
    "ASCUS": "Abnormal",
    "LSIL": "Abnormal",
    "HSIL": "Abnormal",
    "SCC": "Abnormal",
}

BETHESDA_TO_SEVERITY: Dict[str, str] = {
    "NILM": "Normal",
    "ASCUS": "Low_Grade",
    "LSIL": "Low_Grade",
    "HSIL": "High_Grade",
    "SCC": "High_Grade",
}


def get_classes_for_model(model_type: ModelType) -> List[str]:
    """Returns the ordered class list for the specified model type."""
    if model_type == "severity":
        return SEVERITY_CLASSES
    return TRIAGE_CLASSES


def get_idx_to_class(model_type: ModelType) -> Dict[int, str]:
    """Returns index to class dictionary for the specified model type."""
    if model_type == "severity":
        return SEVERITY_IDX_TO_CLASS
    return TRIAGE_IDX_TO_CLASS
