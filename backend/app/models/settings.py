from sqlalchemy import Column, Integer, String
from app.database import Base


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True)
    value = Column(String(2000), nullable=False, default="")


class CustomModel(Base):
    __tablename__ = "custom_models"

    id = Column(Integer, primary_key=True, index=True)
    value = Column(String(200), unique=True, nullable=False)
    label = Column(String(300), nullable=False)
    provider = Column(String(50), nullable=False)


class HiddenModel(Base):
    __tablename__ = "hidden_models"

    value = Column(String(200), primary_key=True)
