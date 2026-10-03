let mode = "login";

function switchTab(m) {
    mode = m;
    document.getElementById("tabLogin").classList.toggle("active", m === "login");
    document.getElementById("tabRegister").classList.toggle("active", m === "register");
    document.getElementById("submitBtn").textContent =
        m === "login" ? "Войти" : "Зарегистрироваться";
    document.getElementById("password").autocomplete =
        m === "login" ? "current-password" : "new-password";
    hideMessage();
}

function showMessage(text, type) {
    const el = document.getElementById("message");
    el.textContent = text;
    el.className = "message " + type;
}
function hideMessage() {
    const el = document.getElementById("message");
    el.className = "message";
    el.textContent = "";
}

async function submitForm(e) {
    e.preventDefault();
    hideMessage();
    const login = document.getElementById("login").value.trim();
    const password = document.getElementById("password").value;
    if (!login || !password) { showMessage("Заполните оба поля", "error"); return; }
    if (password.length < 6) { showMessage("Пароль минимум 6 символов", "error"); return; }

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    try {
        if (mode === "register") {
            const res = await fetch("/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ login, password })
            });
            if (!res.ok) {
                const err = await safeJson(res);
                showMessage(err?.error || `Ошибка ${res.status}`, "error");
                return;
            }
            showMessage("Регистрация успешна. Выполняем вход…", "success");
            await doLogin(login, password);
        } else {
            await doLogin(login, password);
        }
    } catch (err) {
        showMessage("Сетевая ошибка: " + err.message, "error");
    } finally {
        btn.disabled = false;
    }
}

async function doLogin(login, password) {
    const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password })
    });
    if (!res.ok) {
        const err = await safeJson(res);
        showMessage(err?.error || `Ошибка ${res.status}`, "error");
        return;
    }
    const data = await res.json();
    localStorage.setItem("jwt", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    showMessage("Успешно. Перенаправление…", "success");
    setTimeout(() => window.location.href = "/dashboard.html", 400);
}

async function safeJson(res) {
    try { return await res.json(); } catch { return null; }
}

// ---------- Показ/скрытие пароля ----------
function togglePassword() {
    const p = document.getElementById("password");
    const icon = document.getElementById("eyeIcon");
    if (p.type === "password") {
        p.type = "text";
        icon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
        `;
    } else {
        p.type = "password";
        icon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        `;
    }
}

// ---------- Превью логина (аватар + «Будете входить как …») ----------
function initLoginPreview() {
    const loginInput = document.getElementById("login");
    const preview    = document.getElementById("loginPreview");
    const avatarEl   = document.getElementById("loginAvatar");
    const nameEl     = document.getElementById("loginPreviewName");
    if (!loginInput || !preview || !avatarEl) return;

    function update() {
        const v = loginInput.value.trim();
        if (!v) {
            preview.hidden = true;
            return;
        }
        preview.hidden = false;
        avatarEl.textContent = avatarInitial(v);
        avatarEl.style.background = avatarColor(v);
        if (nameEl) nameEl.textContent = v;
    }

    loginInput.addEventListener("input", update);
    update();
}

// ---------- Инициализация ----------
document.addEventListener("DOMContentLoaded", () => {
    initLoginPreview();
    updateThemeIcon();
    if (localStorage.getItem("jwt")) {
        window.location.href = "/dashboard.html";
    }
});