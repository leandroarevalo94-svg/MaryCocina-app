const API_BASE = "https://marycocina-app.onrender.com";

document.addEventListener('DOMContentLoaded', ()=>{
    const toggle = document.querySelector('#view-login .toggle-pwd');
    const pwdInput = document.querySelector('#view-login .input-wrapper input[type="password"]');
    const userInput = document.querySelector('#view-login .input-wrapper input[type="text"]');
    if(toggle && pwdInput){
        toggle.addEventListener('click', ()=>{
            if(pwdInput.type === 'password'){
                pwdInput.type = 'text';
                toggle.classList.remove('fa-eye');
                toggle.classList.add('fa-eye-slash');
            } else {
                pwdInput.type = 'password';
                toggle.classList.remove('fa-eye-slash');
                toggle.classList.add('fa-eye');
            }
        });
    }

    const btn = document.querySelector('.btn-primary');
    if(btn){
        btn.addEventListener('click', async (e)=>{
            e.preventDefault();
            const username = userInput ? userInput.value.trim() : document.querySelector('input[type="text"]')?.value.trim();
            const password = pwdInput ? pwdInput.value : '';

            if(!username || !password){
                alert('Por favor ingresa usuario y contraseña');
                return;
            }
            try{
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                if(!res.ok){
                    // intentar mostrar mensaje de error del backend
                    const text = await res.text().catch(()=>null);
                    try{ const j = JSON.parse(text); alert(j.detail || text || 'Credenciales inválidas'); }
                    catch{ alert(text || 'Credenciales inválidas'); }
                    return;
                }
                const data = await res.json();
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = 'dashboard.html';
            }catch(err){
                console.error(err);
                alert('Error al iniciar sesión');
            }
        });
    }
});
