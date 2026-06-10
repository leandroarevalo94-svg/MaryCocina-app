from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text

from database import Base


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)

    nombre = Column(String, nullable=False)

    categoria = Column(String, nullable=False)

    ingredientes = Column(Text, nullable=False)
    
    preparacion = Column(Text, nullable=False)

    descripcion = Column(Text, nullable=True)

    imagen_url = Column(String, nullable=True)


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)