"""
Pydantic schemas for the public Customer Onboarding Portal API.

Schemas:
  PortalSubmitRequest   — POST /api/v1/portal/submit request body
  PortalSubmitResponse  — successful submission response
  PortalStatusResponse  — GET /api/v1/portal/status/{reference_number} response
"""

from __future__ import annotations

import re
import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

INDIAN_STATES_AND_UTS: frozenset[str] = frozenset(
    [
        # 28 States
        "Andhra Pradesh",
        "Arunachal Pradesh",
        "Assam",
        "Bihar",
        "Chhattisgarh",
        "Goa",
        "Gujarat",
        "Haryana",
        "Himachal Pradesh",
        "Jharkhand",
        "Karnataka",
        "Kerala",
        "Madhya Pradesh",
        "Maharashtra",
        "Manipur",
        "Meghalaya",
        "Mizoram",
        "Nagaland",
        "Odisha",
        "Punjab",
        "Rajasthan",
        "Sikkim",
        "Tamil Nadu",
        "Telangana",
        "Tripura",
        "Uttar Pradesh",
        "Uttarakhand",
        "West Bengal",
        # 8 Union Territories
        "Andaman and Nicobar Islands",
        "Chandigarh",
        "Dadra and Nagar Haveli and Daman and Diu",
        "Delhi",
        "Jammu and Kashmir",
        "Ladakh",
        "Lakshadweep",
        "Puducherry",
    ]
)

_MOBILE_RE = re.compile(r"^[6-9]\d{9}$")
_PINCODE_RE = re.compile(r"^\d{6}$")
_PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
_AADHAAR_RE = re.compile(r"^\d{12}$")


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------


class PortalSubmitRequest(BaseModel):
    """
    Request body for POST /api/v1/portal/submit.

    All free-text string fields are stripped of leading/trailing whitespace.
    The applicant must be at least 18 years old on the date of submission.
    """

    # --- Personal details ---
    full_name: str = Field(
        ...,
        min_length=2,
        max_length=255,
        description="Applicant's full legal name (2–255 characters)",
    )
    date_of_birth: date = Field(
        ...,
        description="Applicant's date of birth; must be at least 18 years before today",
    )
    gender: Literal["Male", "Female", "Other"] = Field(
        ...,
        description="Applicant's gender",
    )
    mobile: str = Field(
        ...,
        description="10-digit Indian mobile number starting with a digit in the range 6–9",
    )
    email: EmailStr = Field(
        ...,
        description="Applicant's email address",
    )

    # --- Address ---
    address: str = Field(
        ...,
        description="Residential address line",
    )
    city: str = Field(
        ...,
        description="City of residence",
    )
    state: str = Field(
        ...,
        description="Indian state or Union Territory of residence",
    )
    pincode: str = Field(
        ...,
        description="6-digit Indian postal code",
    )

    # --- Identity documents ---
    aadhaar_number: str = Field(
        ...,
        description="12-digit Aadhaar number (digits only, whitespace/hyphens stripped)",
    )
    pan_number: str = Field(
        ...,
        description="PAN number in the format ABCDE1234F",
    )

    # ------------------------------------------------------------------
    # Whitespace-stripping validators for all free-text string fields
    # ------------------------------------------------------------------

    @field_validator(
        "full_name",
        "address",
        "city",
        "state",
        "pincode",
        "mobile",
        "aadhaar_number",
        "pan_number",
        mode="before",
    )
    @classmethod
    def strip_whitespace(cls, v: object) -> object:
        """Strip leading/trailing whitespace from free-text string fields."""
        if isinstance(v, str):
            return v.strip()
        return v

    # ------------------------------------------------------------------
    # Field-specific validators
    # ------------------------------------------------------------------

    @field_validator("date_of_birth")
    @classmethod
    def validate_age(cls, v: date) -> date:
        """Applicant must be at least 18 years old on the date of submission."""
        today = date.today()
        # Calculate age by comparing year-month-day to avoid leap-year edge cases
        age = (
            today.year
            - v.year
            - ((today.month, today.day) < (v.month, v.day))
        )
        if age < 18:
            raise ValueError("Applicant must be at least 18 years old.")
        return v

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        """Validate 10-digit Indian mobile number starting with 6–9."""
        if not _MOBILE_RE.match(v):
            raise ValueError(
                "Mobile number must be exactly 10 digits and start with a digit in the range 6–9."
            )
        return v

    @field_validator("state")
    @classmethod
    def validate_state(cls, v: str) -> str:
        """Validate that the state is one of the 36 Indian states/UTs."""
        if v not in INDIAN_STATES_AND_UTS:
            raise ValueError(
                f"'{v}' is not a recognised Indian state or Union Territory."
            )
        return v

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: str) -> str:
        """Validate exactly 6-digit pincode."""
        if not _PINCODE_RE.match(v):
            raise ValueError("Pincode must be exactly 6 digits.")
        return v

    @field_validator("aadhaar_number")
    @classmethod
    def validate_aadhaar(cls, v: str) -> str:
        """Strip whitespace/hyphens and validate 12 numeric digits."""
        cleaned = v.replace(" ", "").replace("-", "")
        if not _AADHAAR_RE.match(cleaned):
            raise ValueError(
                "Aadhaar number must be exactly 12 numeric digits (whitespace and hyphens are ignored)."
            )
        return cleaned

    @field_validator("pan_number")
    @classmethod
    def validate_pan(cls, v: str) -> str:
        """Validate PAN format: ABCDE1234F."""
        if not _PAN_RE.match(v):
            raise ValueError(
                "PAN number must match the format ABCDE1234F "
                "(5 uppercase letters, 4 digits, 1 uppercase letter)."
            )
        return v


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class PortalSubmitResponse(BaseModel):
    """
    Response body for a successful POST /api/v1/portal/submit.

    Returns the human-readable reference number, the UUID of the created
    KYCRecord, and the UTC timestamp of submission.
    """

    reference_number: str = Field(
        ...,
        description="Human-readable reference number derived from the Case's case_number (e.g. KYC-2024-000123)",
    )
    kyc_record_id: uuid.UUID = Field(
        ...,
        description="UUID of the newly created KYCRecord",
    )
    submitted_at: datetime = Field(
        ...,
        description="UTC timestamp of the submission",
    )


class PortalStatusResponse(BaseModel):
    """
    Response body for GET /api/v1/portal/status/{reference_number}.

    Returns the current case and KYC statuses together with an
    applicant-facing label that maps internal statuses to plain language.
    """

    reference_number: str = Field(
        ...,
        description="The reference number that was queried",
    )
    case_status: str = Field(
        ...,
        description="Internal Case status (e.g. open, in_review, pending, closed)",
    )
    kyc_status: str = Field(
        ...,
        description="Internal KYCRecord status (e.g. pending, in_review, verified, rejected)",
    )
    applicant_label: str = Field(
        ...,
        description=(
            "Applicant-facing status label: "
            "'Under Review' | 'Additional Verification Required' | 'Processing' | 'Completed'"
        ),
    )
    submitted_at: datetime = Field(
        ...,
        description="UTC timestamp when the application was originally submitted",
    )
