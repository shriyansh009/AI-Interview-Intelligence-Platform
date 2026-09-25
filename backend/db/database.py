from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from config import get_settings

settings = get_settings()

database_url = settings.DATABASE_URL
if not database_url.startswith("postgresql://"):
    raise ValueError("DATABASE_URL must use a PostgreSQL connection string")

engine = create_engine(database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency to provide a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Helper to initialize database tables."""
    Base.metadata.create_all(bind=engine)
