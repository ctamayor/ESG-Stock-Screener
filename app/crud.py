from sqlalchemy.orm import Session
from . import models

def get_companies(db: Session):
    return db.query(models.Company).all()

def create_or_update_company(db: Session, company_data: dict):
    company_name = company_data.get("company_name")
    # These are the official category names used as keys in the database JSON
    categories = [
        "Climate & Carbon",
        "Natural Resources",
        "Pollution & Waste",
        "Labor & Employees",
        "Community & Customers",
        "Supply Chain",
        "Corporate Governance",
        "Corporate Behavior"
    ]

    # Dynamically build the ratings dictionary.
    # It uses the title-cased category for the key (as intended for the DB)
    # and fetches the data from the source dict using the lower-cased key.
    esg_ratings_payload = {}
    # Iterate through each category to build the payload explicitly
    for category in categories:
        # Get the nested dictionary for the category (e.g., {"rating": 4, "explanation": "..."})
        category_data = company_data.get(category.lower())

        # Check if the data is a dictionary before processing
        if isinstance(category_data, dict):
            # Explicitly create the dictionary to be saved, ensuring both keys are included
            esg_ratings_payload[category] = {
                "rating": category_data.get("rating"),
                "explanation": category_data.get("explanation")
            }
        else:
            # If data for a category is missing or invalid, store null
            esg_ratings_payload[category] = None
            print("Warning: Missing or invalid data for category: ", category)

    # Find an existing company record
    db_company = db.query(models.Company).filter(models.Company.name == company_name).first()

    if db_company:
        # Update existing company
        db_company.esg_ratings = esg_ratings_payload
    else:
        # Create new company
        db_company = models.Company(
            name=company_name,
            esg_ratings=esg_ratings_payload
        )
        db.add(db_company)
    
    db.commit()
    db.refresh(db_company)
    return db_company

def delete_all_data(db: Session):
    """
    Deletes all rows from the tables defined in models.py.
    """
    print("Deleting all data from the 'companies' table...")
    
    # The delete() method efficiently removes all rows from the table
    # without loading them into memory first.
    num_deleted = db.query(models.Company).delete()
    
    # You MUST commit the transaction to make the changes permanent.
    db.commit()
    
    print(f"✅ Successfully deleted {num_deleted} rows.")