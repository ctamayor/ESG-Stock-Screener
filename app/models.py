from sqlalchemy import Column, Integer, String, JSON, UniqueConstraint
from .database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    esg_ratings = Column(JSON)

    __table_args__ = (UniqueConstraint('name', name='_company_name_uc'),)
