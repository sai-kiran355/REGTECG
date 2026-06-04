"""
Simulated Verifier service for Aadhaar and PAN validation.

Provides:
  verify_aadhaar       — Verhoeff checksum validation for 12-digit Aadhaar numbers
  verify_pan           — Regex validation for PAN numbers
  get_aadhaar_mock_data — Deterministic mock data derived from Aadhaar last 4 digits
  get_pan_mock_data    — Deterministic mock data derived from PAN character sequence
  parse_aadhaar        — Strip and validate Aadhaar input, raise on invalid format
  format_aadhaar       — Format 12-digit string as XXXX XXXX XXXX

Requirements: 4.1, 4.2, 4.3, 4.4, 12.1, 12.2, 12.3, 12.5
"""

from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# Verhoeff algorithm tables
# ---------------------------------------------------------------------------

# Multiplication table d
_VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]

# Permutation table p
_VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

# Inverse table inv
_VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

# ---------------------------------------------------------------------------
# PAN regex
# ---------------------------------------------------------------------------

_PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")

# ---------------------------------------------------------------------------
# Mock data pools for deterministic generation
# ---------------------------------------------------------------------------

_MOCK_NAMES = [
    "Aarav Sharma",
    "Priya Patel",
    "Rahul Verma",
    "Sunita Gupta",
    "Vikram Singh",
    "Ananya Nair",
    "Deepak Joshi",
    "Kavita Reddy",
    "Manish Kumar",
    "Pooja Iyer",
    "Suresh Mehta",
    "Rekha Pillai",
    "Arjun Bose",
    "Divya Rao",
    "Nikhil Tiwari",
    "Meena Desai",
]

_MOCK_ADDRESSES = [
    "12, MG Road, Bengaluru, Karnataka 560001",
    "45, Linking Road, Mumbai, Maharashtra 400050",
    "7, Connaught Place, New Delhi, Delhi 110001",
    "23, Park Street, Kolkata, West Bengal 700016",
    "89, Anna Salai, Chennai, Tamil Nadu 600002",
    "34, Banjara Hills, Hyderabad, Telangana 500034",
    "56, Civil Lines, Jaipur, Rajasthan 302006",
    "11, Hazratganj, Lucknow, Uttar Pradesh 226001",
    "78, FC Road, Pune, Maharashtra 411004",
    "3, Navrangpura, Ahmedabad, Gujarat 380009",
    "19, Sector 17, Chandigarh 160017",
    "62, Residency Road, Bengaluru, Karnataka 560025",
    "5, Alipore Road, Kolkata, West Bengal 700027",
    "41, Jubilee Hills, Hyderabad, Telangana 500033",
    "28, Koregaon Park, Pune, Maharashtra 411001",
    "15, Vasant Vihar, New Delhi, Delhi 110057",
]

_MOCK_DOBS = [
    "1985-03-15",
    "1990-07-22",
    "1978-11-08",
    "1995-01-30",
    "1982-06-14",
    "1988-09-03",
    "1975-12-25",
    "1993-04-17",
    "1980-08-09",
    "1997-02-28",
    "1972-05-11",
    "1991-10-06",
    "1986-07-19",
    "1994-03-24",
    "1979-01-05",
    "1996-11-13",
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def verify_aadhaar(number: str) -> bool:
    """
    Validate an Aadhaar number using the Verhoeff checksum algorithm.

    Strips whitespace and hyphens, checks for exactly 12 numeric digits,
    then runs the Verhoeff check. Returns True if valid, False otherwise.

    Requirements: 4.1
    """
    cleaned = _clean_aadhaar(number)
    if not cleaned or not cleaned.isdigit() or len(cleaned) != 12:
        return False
    return _verhoeff_validate(cleaned)


def verify_pan(number: str) -> bool:
    """
    Validate a PAN number against the pattern ^[A-Z]{5}[0-9]{4}[A-Z]{1}$.

    Returns True if valid, False otherwise.

    Requirements: 4.2
    """
    if not number:
        return False
    return bool(_PAN_REGEX.match(number))


def get_aadhaar_mock_data(aadhaar: str) -> dict:
    """
    Return deterministic mock name and address derived from the last 4 digits
    of the cleaned Aadhaar number.

    Requirements: 4.3
    """
    cleaned = _clean_aadhaar(aadhaar)
    last_four = int(cleaned[-4:]) if cleaned and cleaned.isdigit() else 0
    name_idx = last_four % len(_MOCK_NAMES)
    addr_idx = last_four % len(_MOCK_ADDRESSES)
    return {
        "name": _MOCK_NAMES[name_idx],
        "address": _MOCK_ADDRESSES[addr_idx],
    }


def get_pan_mock_data(pan: str) -> dict:
    """
    Return deterministic mock name and date of birth derived from the PAN
    character sequence.

    Uses the sum of ordinal values of all PAN characters as the seed index.

    Requirements: 4.4
    """
    if not pan:
        seed = 0
    else:
        seed = sum(ord(c) for c in pan)
    name_idx = seed % len(_MOCK_NAMES)
    dob_idx = seed % len(_MOCK_DOBS)
    return {
        "name": _MOCK_NAMES[name_idx],
        "date_of_birth": _MOCK_DOBS[dob_idx],
    }


def parse_aadhaar(raw: str) -> str:
    """
    Strip whitespace and hyphens from the input Aadhaar string.

    Raises ValueError with code INVALID_AADHAAR_FORMAT if the result is not
    exactly 12 numeric digits.

    Requirements: 12.1, 12.2, 12.5
    """
    cleaned = _clean_aadhaar(raw)
    if not cleaned or not cleaned.isdigit() or len(cleaned) != 12:
        raise ValueError("INVALID_AADHAAR_FORMAT")
    return cleaned


def format_aadhaar(digits: str) -> str:
    """
    Format a valid 12-digit Aadhaar string as XXXX XXXX XXXX.

    Requirements: 12.3
    """
    return f"{digits[0:4]} {digits[4:8]} {digits[8:12]}"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _clean_aadhaar(raw: str) -> str:
    """Strip all whitespace and hyphens from an Aadhaar string."""
    if not raw:
        return ""
    return raw.replace(" ", "").replace("-", "").replace("\t", "").replace("\n", "")


def _verhoeff_validate(number: str) -> bool:
    """
    Run the Verhoeff check digit algorithm on a digit string.

    Returns True if the check digit is valid (running sum reaches 0).
    """
    c = 0
    for i, digit in enumerate(reversed(number)):
        c = _VERHOEFF_D[c][_VERHOEFF_P[i % 8][int(digit)]]
    return c == 0
