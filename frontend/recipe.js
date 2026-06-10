const API_BASE = "http://127.0.0.1:8000";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const mode = params.get("mode"); // new | edit | null

let currentRecipe = null;

document.addEventListener("DOMContentLoaded", async () => {
    if (mode === "new") {
        enterCreateMode();
        return;
    }

    // Comprobar autenticación (evitar acceso desde historial tras logout)
    const user = localStorage.getItem('user');
    if (!user) {
        location.replace('index.html');
        return;
    }

    if (id) {
        await loadRecipe(id);
    }
});

window.addEventListener('pageshow', ()=>{
    if(!localStorage.getItem('user')) location.replace('index.html');
});

// =========================
// LOAD RECIPE
// =========================
async function loadRecipe(id) {
    const res = await fetch(`${API_BASE}/recipes/${id}`);
    const r = await res.json();

    currentRecipe = r;

    fillView(r);
    bindButtons(r);
    // Asegurarnos de que el image picker tenga sus listeners aunque estemos en modo "view"
    setupImagePicker();
}

// =========================
// RENDER VIEW
// =========================
function fillView(r) {
    document.querySelector(".detail-title").textContent = r.nombre;
    document.querySelector(".detail-description").textContent = r.descripcion;

    const imgEl = document.querySelector('.detail-img');
    let imgSrc = 'https://via.placeholder.com/600x400';
    if (r.imagen_url) {
        if (typeof r.imagen_url === 'string' && r.imagen_url.startsWith('/')) {
            imgSrc = API_BASE + r.imagen_url;
        } else {
            imgSrc = r.imagen_url;
        }
    }
    if (imgEl) imgEl.src = imgSrc;

    // ingredientes
    const ing = document.querySelector(".ingredients-list");
    ing.innerHTML = r.ingredientes
        .split(/,|\n/)
        .filter(Boolean)
        .map(i => `<li>${i}</li>`)
        .join("");

    // pasos
    const steps = document.querySelector(".steps-list");
    steps.innerHTML = r.preparacion
        .split(/\n|\./)
        .filter(Boolean)
        .map((s, i) => `
            <div class="step-item">
                <div class="step-num">${i + 1}</div>
                <div class="step-text">${s}</div>
            </div>
        `).join("");

    const catBadge = document.querySelector('.cat-badge');
    if (catBadge) {
        catBadge.textContent = r.categoria || '';
    }
}

// =========================
// BUTTONS
// =========================
function bindButtons(r) {

    document.querySelector(".btn-outline.edit").onclick = () => {
        enterEditMode(r);
    };

    document.querySelector(".btn-outline.delete").onclick = async () => {
        if (!confirm("¿Eliminar receta?")) return;

        await fetch(`${API_BASE}/recipes/${r.id}`, {
            method: "DELETE"
        });

        window.location.href = "dashboard.html";
    };

    document.querySelector(".btn-outline.save-detail").onclick = async () => {
        await saveRecipe(r.id);
    };

    document.querySelector(".btn-outline.cancel-edit").onclick = () => {

    fillView(r);

    toggleEdit(false);
    };
}

// =========================
// EDIT MODE
// =========================
function enterEditMode(r) {

    document.querySelector(".detail-title-input").value = r.nombre;
    document.querySelector(".detail-description-input").value = r.descripcion;
    document.querySelector(".detail-ingredients-input").value = r.ingredientes;
    document.querySelector(".detail-steps-input").value = r.preparacion;
    document.querySelector(".detail-category-input").value = r.categoria;

    toggleEdit(true);

    // Vincular el picker de imagen cuando entramos a edición
    setupImagePicker();
}

// =========================
// CREATE MODE
// =========================
function enterCreateMode() {

    currentRecipe = {
        nombre: "",
        descripcion: "",
        ingredientes: "",
        preparacion: "",
        categoria: ""
    };

    enterEditMode(currentRecipe);

    document.querySelector(".btn-outline.save-detail").onclick = async () => {
        await saveRecipe();
    };

    document.querySelector(".btn-outline.cancel-edit").onclick = () => {
        window.location.href = "dashboard.html";
    };

    setupImagePicker();
}
// =========================
// UI TOGGLE
// =========================
function toggleEdit(isEdit) {

    // botones
    document.querySelector(".btn-outline.edit").style.display =
        isEdit ? "none" : "inline-flex";

    document.querySelector(".btn-outline.delete").style.display =
        isEdit ? "none" : "inline-flex";

    document.querySelector(".btn-outline.save-detail").style.display =
        isEdit ? "inline-flex" : "none";

    document.querySelector(".btn-outline.cancel-edit").style.display =
        isEdit ? "inline-flex" : "none";


    // vista
    document.querySelector(".detail-title").style.display =
        isEdit ? "none" : "block";

    document.querySelector(".cat-badge").style.display =
        isEdit ? "none" : "inline-flex";

    document.querySelector(".detail-description").style.display =
        isEdit ? "none" : "block";

    document.querySelector(".ingredients-list").style.display =
        isEdit ? "none" : "block";

    document.querySelector(".steps-list").style.display =
        isEdit ? "none" : "block";


    // formulario
    document.querySelector(".detail-title-input").style.display =
        isEdit ? "block" : "none";

    document.querySelector(".detail-category-input").style.display =
        isEdit ? "block" : "none";

    document.querySelector(".detail-description-input").style.display =
        isEdit ? "block" : "none";

    document.querySelector(".detail-ingredients-input").style.display =
        isEdit ? "block" : "none";

    document.querySelector(".detail-steps-input").style.display =
        isEdit ? "block" : "none";


    // cámara
    document.querySelector(".image-add-icon").style.display =
        isEdit ? "flex" : "none";
    // permitir apertura del file picker sólo en modo edición
    const imgEl = document.querySelector('.detail-img');
    if (imgEl) imgEl._allowImagePick = !!isEdit;
}
// =========================
// SAVE (CREATE / UPDATE)
// =========================
async function saveRecipe(id) {
    const nombre = document.querySelector(".detail-title-input").value;
    const descripcion = document.querySelector(".detail-description-input").value;
    const ingredientes = document.querySelector(".detail-ingredients-input").value;
    const preparacion = document.querySelector(".detail-steps-input").value;
    const categoria = document.querySelector(".detail-category-input").value;

    const imageInput = document.querySelector('.detail-image-input');
    const file = imageInput && imageInput.files && imageInput.files[0];

    if (id) {
        // Edit: si hay una imagen nueva, subirla primero y obtener la url
        let imagen_url = null;
        if (file) {
            const fd = new FormData();
            fd.append('imagen', file);
            const r = await fetch(`${API_BASE}/recipes/${id}/upload-image`, {
                method: 'POST',
                body: fd
            });
            if (r.ok) {
                const jr = await r.json();
                imagen_url = jr.imagen_url || jr.imagenUrl || jr.imagen || null;
            } else {
                console.error('Error subiendo imagen:', await r.text());
            }
        }

        const body = { nombre, descripcion, ingredientes, preparacion, categoria };
        if (imagen_url) body.imagen_url = imagen_url;

        await fetch(`${API_BASE}/recipes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        window.location.href = `recipe.html?id=${id}`;
        return;
    }

    // Create
    if (file) {
        const fd = new FormData();
        fd.append('nombre', nombre);
        fd.append('categoria', categoria);
        fd.append('ingredientes', ingredientes);
        fd.append('preparacion', preparacion);
        fd.append('descripcion', descripcion);
        fd.append('imagen', file);

        const r = await fetch(`${API_BASE}/recipes/upload`, {
            method: 'POST',
            body: fd
        });

        if (r.ok) {
            window.location.href = 'dashboard.html';
        } else {
            console.error('Error creando receta con imagen:', await r.text());
        }

    } else {
        // Sin imagen, crear vía JSON
        const body = { nombre, descripcion, ingredientes, preparacion, categoria };
        await fetch(`${API_BASE}/recipes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        window.location.href = 'dashboard.html';
    }
}

function setupImagePicker(){
    const imageInput = document.querySelector('.detail-image-input');
    const imgEl = document.querySelector('.detail-img');
    const imageAddIcon = document.querySelector('.image-add-icon');

    if(!imageInput) return;

    if(!imageInput._changeBound){
        imageInput._changeBound = true;
        imageInput.addEventListener('change', ()=>{
            const f = imageInput.files && imageInput.files[0];
            if(f){
                const url = URL.createObjectURL(f);
                if(imgEl) imgEl.src = url;
            }
        });
    }

    if(imgEl && !imgEl._imageClickBound){
        imgEl._imageClickBound = true;
        imgEl.addEventListener('click', ()=>{ if(imgEl._allowImagePick) imageInput.click(); });
    }

    if(imageAddIcon && !imageAddIcon._imageAddBound){
        imageAddIcon._imageAddBound = true;
        imageAddIcon.addEventListener('click', ()=>{ if(imgEl && imgEl._allowImagePick) imageInput.click(); });
    }
}