from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import crud, models, database

models.Base.metadata.create_all(bind=database.engine)

# Initialize the FastAPI app
app = FastAPI()

# --- CORS Middleware ---
# This is important for allowing your Next.js frontend
# to communicate with this backend server.
# The origin "http://localhost:3000" is the default for Next.js apps.
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ----------------------

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Define the endpoint
@app.get("/api/companies")
async def get_companies(db: Session = Depends(get_db)):
    """
    This endpoint returns a list of companies from the database.
    """
    companies = crud.get_companies(db)
    return {"companies": companies}