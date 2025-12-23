import sys
import os

sys.path.append(os.getcwd())

from databases.database import engine, Base
from databases.models import IRDAIData, CompanyMetrics

def create_tables():
    print("Tables in Base.metadata:", Base.metadata.tables.keys())
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")
    
    # Also check the Base defined in models.py if different
    from databases import models
    if hasattr(models, 'Base') and models.Base != Base:
        print("Different Base found in models.Base")
        print("Tables in models.Base.metadata:", models.Base.metadata.tables.keys())
        models.Base.metadata.create_all(bind=engine)
        print("Created tables from models.Base")

if __name__ == "__main__":
    create_tables()
