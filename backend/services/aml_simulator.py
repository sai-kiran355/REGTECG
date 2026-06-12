import asyncio
import random
import logging
from sqlalchemy import select
from db.session import AsyncSessionLocal
from models.tenant import Tenant
from models.aml_alert import AMLAlert

logger = logging.getLogger(__name__)

ALERT_TEMPLATES = [
    {
        "names": ["Hawala Network Ltd", "Apex Shell Corp", "Global Transit Trading"],
        "entity_type": "entity",
        "alert_type": "layering",
        "desc": "Series of rapid cross-border wires split into smaller tranches and routed to offshore shell accounts.",
        "risk_range": (85, 95),
        "amount_range": (150000, 350000)
    },
    {
        "names": ["Rajesh Gupta", "Amit Sharma", "Kiran Vakada"],
        "entity_type": "individual",
        "alert_type": "structuring",
        "desc": "Customer deposited cash multiple times within 48 hours at different branches keeping each deposit just below the $10,000 CTR threshold.",
        "risk_range": (75, 85),
        "amount_range": (9000, 9900)
    },
    {
        "names": ["Vanguard Retail Holdings", "Gold Star Importing", "Zenith Cash-N-Carry"],
        "entity_type": "entity",
        "alert_type": "cash_intensive",
        "desc": "Company with declared retail operations deposited high volumes of physical cash that do not match peer profile or VAT declarations.",
        "risk_range": (60, 80),
        "amount_range": (120000, 480000)
    },
    {
        "names": ["Al-Baraqa Money Transfer", "Nordic Wires Ltd", "Southern Exchange"],
        "entity_type": "entity",
        "alert_type": "high_risk_country",
        "desc": "Wire transfer executed to an entity located in a high-risk sanction-targeted jurisdiction without adequate commercial invoice documentation.",
        "risk_range": (90, 98),
        "amount_range": (50000, 150000)
    },
    {
        "names": ["Vikram Malhotra", "Suresh Nair", "Priya Patel"],
        "entity_type": "individual",
        "alert_type": "unusual_pattern",
        "desc": "Retail customer salary account received sudden inward domestic wire followed immediately by multiple quick ATM withdrawals at unusual hours.",
        "risk_range": (65, 75),
        "amount_range": (10000, 25000)
    }
]

async def run_background_aml_simulator():
    """Background task to simulate transaction monitoring and generate alerts."""
    logger.info("Starting background AML transaction monitoring simulator...")
    await asyncio.sleep(5)  # Wait for startup checks to complete
    while True:
        try:
            # Generate a new alert every 25-40 seconds with 50% probability
            await asyncio.sleep(random.randint(25, 40))
            if random.random() > 0.5:
                continue

            async with AsyncSessionLocal() as db:
                # Fetch all active tenants
                res = await db.execute(select(Tenant).where(Tenant.status == "active"))
                tenants = res.scalars().all()
                if not tenants:
                    continue
                
                # Pick a random tenant and template
                tenant = random.choice(tenants)
                template = random.choice(ALERT_TEMPLATES)
                
                # Create Alert
                entity_name = random.choice(template["names"])
                risk_score = random.randint(*template["risk_range"])
                amount = float(random.randint(*template["amount_range"]))
                
                alert = AMLAlert(
                    tenant_id=tenant.id,
                    entity_name=entity_name,
                    entity_type=template["entity_type"],
                    alert_type=template["alert_type"],
                    amount=amount,
                    currency="USD",
                    risk_score=risk_score,
                    status="open",
                    description=template["desc"]
                )
                db.add(alert)
                await db.commit()
                logger.info(
                    "AML Simulator: Generated suspicious transaction alert for %s (Tenant: %s, Alert Type: %s)",
                    entity_name, tenant.slug, template["alert_type"]
                )
        except asyncio.CancelledError:
            logger.info("Background AML simulator task cancelled.")
            break
        except Exception as e:
            logger.error("Error in AML simulator background loop: %s", e, exc_info=True)
