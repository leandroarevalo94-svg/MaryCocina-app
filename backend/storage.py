from supabase import create_client
from dotenv import load_dotenv
import os
import uuid

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)

BUCKET = "Recetas"


def save_uploaded_image(upload):
    ext = os.path.splitext(upload.filename)[1]

    if not ext:
        ext = ".jpg"

    nombre_unico = f"{uuid.uuid4().hex}{ext}"

    contenido = upload.file.read()

    supabase.storage \
        .from_(BUCKET) \
        .upload(
            nombre_unico,
            contenido
        )

    return supabase.storage \
        .from_(BUCKET) \
        .get_public_url(nombre_unico)