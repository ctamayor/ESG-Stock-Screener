from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import crud, models, database
import os
import logging

# --- ADD THIS: Configure logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- ADD THIS: Log right at the start ---
logger.info("✅ Python script starting up...")

try:
    models.Base.metadata.create_all(bind=database.engine)
    logger.info("✅ Database models bound successfully.")
except Exception as e:
    # --- ADD THIS: Log any database binding errors ---
    logger.error(f"❌ DATABASE BINDING FAILED: {e}", exc_info=True)


app = FastAPI()

ALLOWED_ORIGINS = [os.getenv("VERCEL_URL", "http://localhost:3000")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    # --- ADD THIS: Log database connection attempt ---
    logger.info("Attempting to create database session...")
    db = database.SessionLocal()
    try:
        yield db
        logger.info("Database session yielded successfully.")
    except Exception as e:
        # --- ADD THIS: Log any session creation errors ---
        logger.error(f"❌ DATABASE SESSION FAILED: {e}", exc_info=True)
    finally:
        db.close()
        logger.info("Database session closed.")

@app.get("/api/companies")
async def get_companies(db: Session = Depends(get_db)):
    # --- ADD THIS: Log endpoint entry ---
    logger.info("--> Request received at /api/companies endpoint.")
    try:
        companies = crud.get_companies(db)
        logger.info(f"✅ Found {len(companies)} companies.")
        return {"companies": companies}
    except Exception as e:
        # --- ADD THIS: Log errors during the database query ---
        logger.error(f"❌ ERROR in get_companies: {e}", exc_info=True)
        # Raise an HTTPException to send a proper error response to the frontend
        raise HTTPException(status_code=500, detail="Internal server error while fetching companies.")