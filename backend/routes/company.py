from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from databases.database import get_db
from databases.models import Company
from pydantic import BaseModel
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/companies", tags=["companies"])


class CompanyCreate(BaseModel):
    name: str


class CompanyResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[CompanyResponse])
def get_companies(db: Session = Depends(get_db)):
    """Get all companies from database"""
    try:
        companies = db.query(Company).all()
        return companies
    except Exception as e:
        logger.error(f"Error fetching companies: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch companies")


@router.post("/", response_model=CompanyResponse)
def create_company(company: CompanyCreate, db: Session = Depends(get_db)):
    """Create a new company"""
    try:
        # Check if company already exists
        existing_company = db.query(Company).filter(
            Company.name.ilike(company.name.strip())).first()
        if existing_company:
            raise HTTPException(
                status_code=400, detail=f"Company '{company.name}' already exists")

        # Create new company
        db_company = Company(name=company.name.strip().lower())
        db.add(db_company)
        db.commit()
        db.refresh(db_company)

        logger.info(f"Created new company: {db_company.name}")
        return db_company
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating company: {e}")
        raise HTTPException(status_code=500, detail="Failed to create company")


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(company_id: int, db: Session = Depends(get_db)):
    """Get a specific company by ID"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.delete("/{company_id}")
def delete_company(company_id: int, db: Session = Depends(get_db)):
    """Delete a company"""
    try:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        db.delete(company)
        db.commit()
        logger.info(f"Deleted company: {company.name}")
        return {"message": f"Company '{company.name}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting company: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete company")


class CompanyUpdate(BaseModel):
    name: Optional[str] = None


@router.patch("/{company_id}", response_model=CompanyResponse)
def update_company(company_id: int, company_update: CompanyUpdate, db: Session = Depends(get_db)):
    """Update an existing company"""
    try:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        if company_update.name:
            # Check for duplicate
            existing_company = db.query(Company).filter(
                Company.name.ilike(company_update.name.strip())
            ).first()
            if existing_company and existing_company.id != company_id:
                raise HTTPException(
                    status_code=400, detail=f"Company '{company_update.name}' already exists"
                )
            company.name = company_update.name.strip().lower()

        db.commit()
        db.refresh(company)
        logger.info(f"Updated company: {company.name}")
        return company
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating company: {e}")
        raise HTTPException(status_code=500, detail="Failed to update company")
