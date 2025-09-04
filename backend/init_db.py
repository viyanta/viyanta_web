"""
Database initialization script
Creates tables and adds default companies
"""
import logging
from databases.database import engine, SessionLocal
from databases.models import Base, Company

logger = logging.getLogger(__name__)


def init_database():
    """Initialize database with tables and default data"""
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")

        # Add default companies if they don't exist
        db = SessionLocal()
        try:
            # Check if companies already exist
            existing_companies = db.query(Company).count()

            if existing_companies == 0:
                default_companies = [
                    Company(name="sbi"),
                    Company(name="hdfc"),
                    Company(name="icici"),
                    Company(name="bajaj"),
                    Company(name="lic"),
                    Company(name="reliance"),
                ]

                for company in default_companies:
                    db.add(company)

                db.commit()
                logger.info(
                    f"Added {len(default_companies)} default companies")
            else:
                logger.info(
                    f"Database already has {existing_companies} companies")

        except Exception as e:
            db.rollback()
            logger.error(f"Error adding default companies: {e}")
            raise
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_database()
    print("Database initialization completed!")
