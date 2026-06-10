from pydantic import BaseModel


class RecipeCreate(BaseModel):
    nombre: str
    categoria: str
    ingredientes: str
    preparacion: str


class RecipeResponse(RecipeCreate):
    id: int
    foto: str | None = None

    class Config:
        from_attributes = True