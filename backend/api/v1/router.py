"""API v1 router — aggregates all sub-routers under /api/v1/."""

from __future__ import annotations
from fastapi import APIRouter
from api.v1 import aml, audit, auth, cases, chat, health, kyc, profile, sanctions, signup, users_admin, portal, applicant_auth, recruitment, careers

router = APIRouter()

router.include_router(health.router)
router.include_router(auth.router)
router.include_router(signup.router)
router.include_router(cases.router)
router.include_router(kyc.router)
router.include_router(aml.router)
router.include_router(sanctions.router)
router.include_router(audit.router)
router.include_router(users_admin.router)
router.include_router(profile.router)
router.include_router(portal.router)
router.include_router(applicant_auth.router)
router.include_router(chat.router)
router.include_router(recruitment.router)
router.include_router(careers.router)
