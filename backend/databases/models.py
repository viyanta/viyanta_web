from sqlalchemy import Column, Integer, String, Text
from databases.database import Base


class Company(Base):
    __tablename__ = "company"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
