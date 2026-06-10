const API_BASE = "http://127.0.0.1:8000";

function isAuthenticated(){
    return !!localStorage.getItem('user');
}

function ensureAuth(){
    if(!isAuthenticated()) location.replace('index.html');
}

document.addEventListener("DOMContentLoaded", () => {
    ensureAuth();
    loadRecipes();
    loadCategories();
});

// Cuando el usuario vuelve con el botón "atrás" (bfcache/pageshow), volvemos a comprobar auth
window.addEventListener('pageshow', (e)=>{ ensureAuth(); });

// Cargar categorías para el filtro
async function loadCategories() {
    const res = await fetch(`${API_BASE}/recipes`);
    const data = await res.json();
    const select = document.querySelector('.category-select');
    if (!select) return;
    select.innerHTML = `\n                <option value="">\n                    Todas las categorías\n                </option>\n`;
    const cats = [...new Set(data.map(r => r.categoria).filter(Boolean))];
    cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
        const search = document.querySelector('.search-input')?.value || '';
        loadRecipes(search, e.target.value);
    });
}

// (loadCategories ahora se llama desde el DOMContentLoaded anterior)

// Cargar recetas
async function loadRecipes(search = "", categoria = "") {
    const params = new URLSearchParams();

    if (search) params.set("search", search);
    if (categoria) params.set("categoria", categoria);

    const res = await fetch(`${API_BASE}/recipes?${params}`);
    const data = await res.json();

    const list = document.querySelector(".recipe-list");
    list.innerHTML = "";

    data.forEach(r => {
        const card = document.createElement("div");
        card.className = "recipe-item";

        let img = r.imagen_url || "https://via.placeholder.com/150";
        if (img.startsWith("/")) img = API_BASE + img;

        card.innerHTML = `
            <img class="recipe-thumb" src="${img}">
            <div class="recipe-info">
                <h3>${r.nombre}</h3>
                <div class="recipe-category">${r.categoria}</div>
            </div>
        `;

        card.onclick = () => {
            window.location.href = `recipe.html?id=${r.id}`;
        };

        list.appendChild(card);
    });
}

// SEARCH
document.addEventListener("input", (e) => {
    if (e.target.matches(".search-input")) {
        const categoria = document.querySelector('.category-select')?.value || '';
        loadRecipes(e.target.value, categoria);
    }
});

// NUEVA RECETA
document.addEventListener("click", (e) => {
    if (e.target.closest(".btn-add")) {
        window.location.href = "recipe.html?mode=new";
    }

    if (e.target.closest(".btn-logout")) {
        // logout: limpiar sesión y reemplazar la entrada de historial
        localStorage.removeItem('user');
        // Reemplazamos la ubicación y añadimos un estado para evitar volver a página protegida
        location.replace('index.html');
        try{ history.pushState(null, '', 'index.html'); }catch(_){/* ignore */}
    }
});

