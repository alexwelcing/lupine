"""Frozen experimental reference data for the error-geometry replication kit.

Single-crystal elastic constants in GPa, experimental (Simmons & Wang 1971
lineage; Cr from the 350/67.8/100 experimental compilation). This table is
byte-identical in content to PUBLISHED_C_IJ in mlip_immi/elastic_constants.py
and REFERENCE_ELASTIC_GPA in tools/mlip_kimi_evidence.py — the same references
used for the classical 559-potential analysis and for the MLIP anchors.
"""

REFERENCE_C_GPA = {
    "Al": (107.0, 60.9, 28.3),
    "Cu": (169.0, 122.0, 75.3),
    "Ni": (247.0, 153.0, 122.0),
    "Ag": (124.0, 93.4, 46.1),
    "Au": (192.4, 162.9, 39.8),
    "Pt": (346.7, 250.7, 76.5),
    "Pd": (234.1, 176.1, 71.2),
    "Pb": (49.5, 42.3, 14.9),
    "Fe": (230.0, 135.0, 117.0),
    "Cr": (350.0, 67.0, 100.8),
    "Mo": (463.7, 157.8, 109.2),
    "W": (522.4, 204.4, 160.6),
    "V": (232.4, 119.4, 43.7),
    "Nb": (246.5, 134.5, 28.7),
    "Ta": (266.3, 158.2, 87.4),
}

FCC = {"Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb"}
BCC = {"Fe", "Cr", "Mo", "W", "V", "Nb", "Ta"}

A0_GUESS_ANGSTROM = {
    "Al": 4.05, "Cu": 3.61, "Ni": 3.52, "Ag": 4.09, "Au": 4.08,
    "Pt": 3.92, "Pd": 3.89, "Pb": 4.95,
    "Fe": 2.87, "Cr": 2.88, "Mo": 3.15, "W": 3.16,
    "V": 3.03, "Nb": 3.30, "Ta": 3.30,
}


def born_stable(c11: float, c12: float, c44: float) -> bool:
    """Born mechanical-stability screen for cubic crystals, applied identically
    to classical potentials and every MLIP in this program."""
    return c11 > 0 and c44 > 0 and c11 > abs(c12)
