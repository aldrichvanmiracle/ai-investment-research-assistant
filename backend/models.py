from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from database import Base

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, index=True)
    name = Column(String)
    asset_type = Column(String)
    sector = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(String, index=True)
    analysis = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class InvestmentThesis(Base):
    __tablename__ = "investment_theses"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True)
    reasons = Column(String)
    analysis = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)