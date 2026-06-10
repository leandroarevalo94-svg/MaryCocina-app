# =========================
# IMPORTS FASTAPI
# =========================
from fastapi import FastAPI, Depends, HTTPException, Query, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
# =========================
# SQLALCHEMY
# =========================
from sqlalchemy.orm import Session

# DB config
from database import Base, engine, SessionLocal

# Modelo
from models import Recipe, User
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# =========================
# PYDANTIC SCHEMAS
# =========================
from pydantic import BaseModel
from typing import Optional
import os
import uuid
from pathlib import Path
# =========================
# Guardar imágenes en Supabase Storage
from storage import save_uploaded_image
# =========================

# =========================
# APP INIT
# =========================
app = FastAPI()
# =========================
# CORS (permite frontend)
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# =========================
# CREAR TABLAS
# =========================
Base.metadata.create_all(bind=engine)


# =========================
# DB DEPENDENCY
# =========================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================
# SCHEMA RECETA
# =========================
class RecipeCreate(BaseModel):
    nombre: str
    categoria: str
    ingredientes: str
    preparacion: str
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None


# =========================
# AUTH SCHEMAS
# =========================
class UserCreate(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str


# =========================
# GET RECETAS (con filtros)
# =========================
@app.get("/recipes")
def get_recipes(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None)
):
    """
    Devuelve recetas con filtros opcionales:
    - search: filtra por nombre
    - categoria: filtra por categoría
    """

    query = db.query(Recipe)

    if search:
        query = query.filter(Recipe.nombre.ilike(f"%{search}%"))

    if categoria:
        query = query.filter(Recipe.categoria.ilike(f"%{categoria}%"))

    return query.all()


# =========================
# GET RECETA POR ID
# =========================
@app.get("/recipes/{recipe_id}")
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    """
    Devuelve una receta específica por ID
    """

    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()

    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")

    return recipe


# =========================
# USERS / AUTH
# =========================
@app.post('/users', response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail='Usuario ya existe')

    hashed = pwd_context.hash(user.password)
    u = User(username=user.username, password_hash=hashed)
    db.add(u)
    db.commit()
    db.refresh(u)
    return UserOut(id=u.id, username=u.username)


@app.post('/auth/login')
def login(user: UserCreate, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.username == user.username).first()
    if not u or not pwd_context.verify(user.password, u.password_hash):
        raise HTTPException(status_code=401, detail='Credenciales inválidas')

    # For simplicity, return basic user info. Frontend may store this in localStorage.
    return { 'ok': True, 'user': { 'id': u.id, 'username': u.username } }


# =========================
# CREAR RECETA
# =========================
@app.post("/recipes")
def create_recipe(recipe: RecipeCreate, db: Session = Depends(get_db)):
    """
    Crea una nueva receta
    """

    new_recipe = Recipe(
        nombre=recipe.nombre,
        categoria=recipe.categoria,
        ingredientes=recipe.ingredientes,
        preparacion=recipe.preparacion,
        descripcion=recipe.descripcion,
        imagen_url=recipe.imagen_url
    )

    db.add(new_recipe)
    db.commit()
    db.refresh(new_recipe)

    return new_recipe


# Endpoint alternativo para crear receta con imagen subida (multipart/form-data)
@app.post("/recipes/upload")
def create_recipe_with_image(
    nombre: str = Form(...),
    categoria: str = Form(...),
    ingredientes: str = Form(...),
    preparacion: str = Form(...),
    descripcion: Optional[str] = Form(None),
    imagen: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    imagen_url = None
    if imagen:
        try:
            imagen_url = save_uploaded_image(imagen)
        finally:
            imagen.file.close()

    new_recipe = Recipe(
        nombre=nombre,
        categoria=categoria,
        ingredientes=ingredientes,
        preparacion=preparacion,
        descripcion=descripcion,
        imagen_url=imagen_url
    )

    db.add(new_recipe)
    db.commit()
    db.refresh(new_recipe)

    return new_recipe


# Endpoint para actualizar imagen de una receta (multipart)
@app.post("/recipes/{recipe_id}/upload-image")
def upload_recipe_image(recipe_id: int, imagen: UploadFile = File(...), db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")

    try:
        imagen_url = save_uploaded_image(imagen)
    finally:
        imagen.file.close()

    recipe.imagen_url = imagen_url
    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    return recipe


# =========================
# EDITAR RECETA
# =========================
@app.put("/recipes/{recipe_id}")
def update_recipe(recipe_id: int, data: RecipeCreate, db: Session = Depends(get_db)):
    """
    Actualiza una receta existente
    """

    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()

    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")

    recipe.nombre = data.nombre
    recipe.categoria = data.categoria
    recipe.ingredientes = data.ingredientes
    recipe.preparacion = data.preparacion
    recipe.descripcion = data.descripcion
    # Only update imagen_url if the client provided a value (not None).
    # This preserves the existing image when the user doesn't change it.
    if data.imagen_url is not None:
        recipe.imagen_url = data.imagen_url

    db.commit()
    db.refresh(recipe)

    return recipe


# =========================
# ELIMINAR RECETA
# =========================
@app.delete("/recipes/{recipe_id}")
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    """
    Elimina una receta por ID
    """

    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()

    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")

    db.delete(recipe)
    db.commit()

    return {"message": "Receta eliminada"}


# =========================
# RELLENAR DESCRIPCIONES E IMAGENES FALTANTES
# Se ejecuta al arrancar la aplicación para completar campos vacíos
# =========================
def fill_missing_descriptions_and_images():
    db = SessionLocal()
    try:
        recipes = db.query(Recipe).all()
        print(f"Found {len(recipes)} recipes")
        for r in recipes:
            changed = False
            if not getattr(r, 'descripcion', None):
                prep = (r.preparacion or '').strip()
                desc = ''
                if prep:
                    import re
                    m = re.split(r'[\.\n]', prep)
                    desc = m[0].strip() if m and m[0].strip() else prep[:120].strip()
                else:
                    desc = ''
                r.descripcion = desc
                changed = True
            if not getattr(r, 'imagen_url', None):
                r.imagen_url = 'https://via.placeholder.com/600x400?text=Sin+imagen'
                changed = True
            if changed:
                print(f"Updating recipe id={r.id}")
                db.add(r)

        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def _startup_fill():
    try:
        fill_missing_descriptions_and_images()
    except Exception as e:
        # No bloquear el arranque por errores no críticos
        print("fill_missing_descriptions_and_images failed:", e)

    # Crear usuario por defecto si no existe (solo entorno de desarrollo)
    try:
        def create_default_user():
            db = SessionLocal()
            try:
                ucount = db.query(User).count()
                if ucount == 0:
                    default_user = os.getenv('DEFAULT_USER', 'admin')
                    default_pass = os.getenv('DEFAULT_PASS', 'admin')
                    hashed = pwd_context.hash(default_pass)
                    u = User(username=default_user, password_hash=hashed)
                    db.add(u)
                    db.commit()
                    print(f"Default user created: {default_user}")
            finally:
                db.close()

        create_default_user()
    except Exception as e:
        print('create_default_user failed:', e)