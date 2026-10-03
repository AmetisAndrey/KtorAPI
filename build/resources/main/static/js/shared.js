// ---------- Тема ----------
(function initTheme() {
    const saved = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    document.addEventListener("DOMContentLoaded", updateThemeIcon);
})();

function updateThemeIcon() {
    const icon = document.getElementById("themeIcon");
    if (!icon) return;
    const cur = document.documentElement.getAttribute("data-theme");
    icon.innerHTML = cur === "dark"
        ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
        : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>';
}

function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    updateThemeIcon();
    if (typeof window.__onThemeChange === "function") {
        window.__onThemeChange();
    }
}

// ---------- Тосты ----------
function toast(message, type = "info", timeout = 3500) {
    const stack = document.getElementById("toasts");
    if (!stack) { console.log(`[toast:${type}]`, message); return; }
    const el = document.createElement("div");
    el.className = "toast " + (type || "");
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => {
        el.classList.add("fade-out");
        setTimeout(() => el.remove(), 250);
    }, timeout);
}

// ---------- Аватар ----------
function avatarColor(login) {
    const palette = [
        "#4f46e5", "#0891b2", "#059669", "#65a30d",
        "#ca8a04", "#ea580c", "#dc2626", "#db2777",
        "#7c3aed", "#475569"
    ];
    let hash = 0;
    const s = String(login || "?");
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0;
    }
    return palette[Math.abs(hash) % palette.length];
}

function avatarInitial(login) {
    const s = String(login || "?").trim();
    return s ? s[0].toUpperCase() : "?";
}

function renderAvatar(el, login, sizeClass = "") {
    if (!el) return;
    el.textContent = avatarInitial(login);
    el.style.background = avatarColor(login);
    el.classList.remove("sm", "lg");
    if (sizeClass) el.classList.add(sizeClass);
}

// ---------- Утилиты ----------
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

// ---------- Экспорт CSV/JSON ----------
function exportData(rows, format) {
    if (!Array.isArray(rows) || !rows.length) {
        toast("Нечего экспортировать: список пуст", "warn");
        return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    if (format === "json") {
        const blob = new Blob(
            [JSON.stringify(rows, null, 2)],
            { type: "application/json;charset=utf-8" }
        );
        downloadBlob(blob, `tasks-${stamp}.json`);
        toast(`Экспортировано ${rows.length} задач в JSON`, "success");
        return;
    }
    if (format === "csv") {
        const csv = toCSV(rows);
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        downloadBlob(blob, `tasks-${stamp}.csv`);
        toast(`Экспортировано ${rows.length} задач в CSV`, "success");
        return;
    }
}

function toCSV(rows) {
    const headers = ["id", "title", "description", "completed", "ownerId"];
    const lines = [headers.join(",")];
    for (const t of rows) {
        lines.push([
            t.id,
            csvEscape(t.title),
            csvEscape(t.description ?? ""),
            t.completed ? "true" : "false",
            t.ownerId ?? ""
        ].join(","));
    }
    return lines.join("\r\n");
}

function csvEscape(value) {
    const s = String(value ?? "");
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}