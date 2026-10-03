// ---------- Авторизация ----------
let token = localStorage.getItem("jwt");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token) window.location.href = "/login.html";

// ---------- Состояние ----------
let allTasks = [];          // все задачи с сервера
let filteredTasks = [];     // после поиска и фильтра
let currentPage = 1;
let pageSize = parseInt(localStorage.getItem("pageSize") || "10", 10);
// sort: { key, dir: 'asc'|'desc' } | null
let sort = null;

let chartStatus, chartLength, chartProgress;

// ---------- API ----------
async function api(url, method = "GET", body = null, auth = false) {
    const headers = {};
    if (body) headers["Content-Type"] = "application/json";
    if (auth) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined
    });

    if (res.status === 401) {
        localStorage.removeItem("jwt");
        localStorage.removeItem("user");
        window.location.href = "/login.html";
        return null;
    }
    if (res.status === 204) return null;

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!res.ok) {
        const msg = (data && data.error) ? data.error : `${method} ${url} → ${res.status}`;
        toast(msg, "error");
        console.warn(msg, data);
        return null;
    }
    return data;
}

// ---------- Загрузка ----------
async function loadTasks() {
    const data = await api("/tasks");
    if (!Array.isArray(data)) return;
    allTasks = data;
    window.__tasks = data;
    renderStats(data);
    renderCharts(data);
    applyAll();
}

// ---------- Фильтр + сортировка + пагинация ----------
function onFilterChange() {
    currentPage = 1;
    applyAll();
}

function onPageSizeChange() {
    pageSize = parseInt(document.getElementById("pageSize").value, 10);
    localStorage.setItem("pageSize", String(pageSize));
    currentPage = 1;
    applyAll();
}

function onSortClick(key) {
    if (!sort || sort.key !== key) {
        sort = { key, dir: "asc" };
    } else if (sort.dir === "asc") {
        sort = { key, dir: "desc" };
    } else {
        sort = null;
    }
    currentPage = 1;
    applyAll();
}

function applyAll() {
    const q = document.getElementById("searchInput").value.trim().toLowerCase();
    const status = document.getElementById("filterStatus").value;

    let result = allTasks.slice();
    if (status === "done") result = result.filter(t => t.completed);
    if (status === "todo") result = result.filter(t => !t.completed);
    if (q) {
        result = result.filter(t =>
            (t.title || "").toLowerCase().includes(q) ||
            (t.description || "").toLowerCase().includes(q)
        );
    }
    if (sort) {
        const { key, dir } = sort;
        const mul = dir === "asc" ? 1 : -1;
        result.sort((a, b) => compareBy(a, b, key) * mul);
    }

    filteredTasks = result;
    updateSortIndicators();

    const totalPages = computeTotalPages(result.length);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    renderPaginatedTable();
    renderPagination();
}

function compareBy(a, b, key) {
    const va = a[key];
    const vb = b[key];
    if (key === "completed") return (va === vb) ? 0 : (va ? 1 : -1);
    if (typeof va === "number" && typeof vb === "number") return va - vb;
    return String(va ?? "").localeCompare(String(vb ?? ""), "ru", { sensitivity: "base" });
}

function computeTotalPages(totalItems) {
    if (pageSize === 0) return 1;
    return Math.max(1, Math.ceil(totalItems / pageSize));
}

function renderPaginatedTable() {
    let slice;
    if (pageSize === 0) {
        slice = filteredTasks;
    } else {
        const start = (currentPage - 1) * pageSize;
        slice = filteredTasks.slice(start, start + pageSize);
    }
    renderTable(slice);
}

function updateSortIndicators() {
    document.querySelectorAll("th.sortable").forEach(th => {
        const key = th.dataset.sort;
        th.classList.remove("sorted-asc", "sorted-desc");
        const ind = th.querySelector(".sort-indicator");
        if (!sort || sort.key !== key) {
            ind.textContent = "↕";
        } else if (sort.dir === "asc") {
            th.classList.add("sorted-asc");
            ind.textContent = "▲";
        } else {
            th.classList.add("sorted-desc");
            ind.textContent = "▼";
        }
    });
}

// ---------- Пагинация ----------
function renderPagination() {
    const info = document.getElementById("pageInfo");
    const controls = document.getElementById("pageControls");
    const total = filteredTasks.length;
    const totalPages = computeTotalPages(total);

    if (total === 0) {
        info.textContent = "Ничего не найдено";
        controls.innerHTML = "";
        return;
    }

    let startIdx, endIdx;
    if (pageSize === 0) {
        startIdx = 1; endIdx = total;
    } else {
        startIdx = (currentPage - 1) * pageSize + 1;
        endIdx = Math.min(currentPage * pageSize, total);
    }
    info.textContent = `Показано ${startIdx}–${endIdx} из ${total}`;

    if (pageSize === 0 || totalPages <= 1) {
        controls.innerHTML = "";
        return;
    }

    const buttons = [];
    buttons.push(pageBtn("‹", currentPage - 1, currentPage === 1, "Назад"));

    for (const p of buildPageNumbers(currentPage, totalPages)) {
        if (p === "...") {
            buttons.push(`<button disabled>…</button>`);
        } else {
            buttons.push(pageBtn(String(p), p, false, `Страница ${p}`, p === currentPage));
        }
    }
    buttons.push(pageBtn("›", currentPage + 1, currentPage === totalPages, "Вперёд"));
    controls.innerHTML = buttons.join("");
}

function pageBtn(label, targetPage, disabled, title = "", active = false) {
    return `<button ${disabled ? "disabled" : ""} ${active ? 'class="active"' : ""}
                title="${title}" onclick="goToPage(${targetPage})">${label}</button>`;
}

function goToPage(p) {
    const totalPages = computeTotalPages(filteredTasks.length);
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    renderPaginatedTable();
    renderPagination();
    document.querySelector(".table-wrap").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function buildPageNumbers(current, total) {
    const pages = [];
    const add = (v) => pages.push(v);
    if (total <= 7) {
        for (let i = 1; i <= total; i++) add(i);
        return pages;
    }
    add(1);
    const left = Math.max(2, current - 1);
    const right = Math.min(total - 1, current + 1);
    if (left > 2) add("...");
    for (let i = left; i <= right; i++) add(i);
    if (right < total - 1) add("...");
    add(total);
    return pages;
}

// ---------- CRUD ----------
async function createTask() {
    const titleInput = document.getElementById("newTitle");
    const descInput  = document.getElementById("newDescription");

    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    if (!title) { toast("Введите название задачи", "warn"); titleInput.focus(); return; }

    const created = await api("/tasks", "POST", { title, description }, true);
    if (created) toast(`Задача #${created.id} создана`, "success");

    titleInput.value = "";
    descInput.value = "";
    titleInput.focus();
    loadTasks();
}

async function markDone(id) {
    const updated = await api(`/tasks/${id}`, "PUT", { completed: true }, true);
    if (updated) { toast(`Задача #${id} отмечена выполненной`, "success"); loadTasks(); }
}

async function markTodo(id) {
    const updated = await api(`/tasks/${id}`, "PUT", { completed: false }, true);
    if (updated) { toast(`Задача #${id} возвращена в работу`, "warn"); loadTasks(); }
}

async function deleteTask(id) {
    if (!confirm(`Удалить задачу #${id}?`)) return;
    const res = await fetch(`/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 204) {
        toast(`Задача #${id} удалена`, "success");
        loadTasks();
    } else if (res.status === 401) {
        logout();
    } else {
        const text = await res.text();
        toast(`Ошибка ${res.status}: ${text}`, "error");
    }
}

// ---------- Модальное редактирование ----------
let editingId = null;

function openEditModal(id) {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;
    editingId = id;
    document.getElementById("editTitle").value = task.title || "";
    document.getElementById("editDescription").value = task.description || "";
    document.getElementById("editModal").classList.add("open");
    setTimeout(() => document.getElementById("editTitle").focus(), 50);
}

function closeEditModal() {
    editingId = null;
    document.getElementById("editModal").classList.remove("open");
}

async function saveEdit() {
    if (editingId == null) return;
    const title = document.getElementById("editTitle").value.trim();
    const description = document.getElementById("editDescription").value.trim();
    if (!title) { toast("Название не может быть пустым", "warn"); return; }

    const updated = await api(`/tasks/${editingId}`, "PUT", { title, description }, true);
    if (updated) {
        toast(`Задача #${editingId} обновлена`, "success");
        closeEditModal();
        loadTasks();
    }
}

// ---------- Отрисовка таблицы ----------
function renderTable(tasks) {
    const tbody = document.getElementById("taskBody");
    const empty = document.getElementById("emptyState");

    if (!tasks.length) {
        tbody.innerHTML = "";
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";

    tbody.innerHTML = tasks.map(t => `
        <tr data-id="${t.id}">
            <td>${t.id}</td>
            <td class="title-cell">${escapeHtml(t.title)}</td>
            <td class="desc-cell">${escapeHtml(t.description ?? "")}</td>
            <td><span class="tag ${t.completed ? "done" : "todo"}">${t.completed ? "Выполнено" : "В работе"}</span></td>
            <td>
                <div class="actions">
                    ${!t.completed
        ? `<button class="success" onclick="markDone(${t.id})" title="Отметить выполненной">
                               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                               Выполнено
                           </button>`
        : `<button class="secondary" onclick="markTodo(${t.id})" title="Вернуть в работу">
                               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                               Вернуть
                           </button>`}
                    <button class="secondary" onclick="openEditModal(${t.id})" title="Редактировать">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Изменить
                    </button>
                    <button class="danger" onclick="deleteTask(${t.id})" title="Удалить">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                        Удалить
                    </button>
                </div>
            </td>
        </tr>
    `).join("");
}

// ---------- Метрики ----------
function renderStats(tasks) {
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    const todo = total - done;
    const pct = total ? Math.round(done / total * 100) : 0;

    document.getElementById("statTotal").textContent = total;
    document.getElementById("statDone").textContent = done;
    document.getElementById("statTodo").textContent = todo;
    document.getElementById("statPct").textContent = pct + "%";
}

// ---------- Графики ----------
function chartColors() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    return {
        text: dark ? "#cbd5e1" : "#374151",
        grid: dark ? "#334155" : "#e5e7eb",
        accent: dark ? "#818cf8" : "#4f46e5",
        accentSoft: dark ? "rgba(129,140,248,.2)" : "rgba(79,70,229,.15)",
        success: dark ? "#4ade80" : "#22c55e",
        warning: dark ? "#fbbf24" : "#f59e0b"
    };
}

function renderCharts(tasks) {
    const c = chartColors();
    const done = tasks.filter(t => t.completed).length;
    const todo = tasks.length - done;

    if (chartStatus) chartStatus.destroy();
    chartStatus = new Chart(document.getElementById("chartStatus"), {
        type: "doughnut",
        data: {
            labels: ["Выполнено", "В работе"],
            datasets: [{
                data: [done, todo],
                backgroundColor: [c.success, c.warning],
                borderWidth: 0, hoverOffset: 6
            }]
        },
        options: {
            cutout: "65%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { color: c.text, padding: 16, usePointStyle: true }
                }
            }
        }
    });

    if (chartLength) chartLength.destroy();
    chartLength = new Chart(document.getElementById("chartLength"), {
        type: "bar",
        data: {
            labels: tasks.map(t => `#${t.id}`),
            datasets: [{
                label: "Символов в названии",
                data: tasks.map(t => (t.title || "").length),
                backgroundColor: c.accent, borderRadius: 6, maxBarThickness: 32
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: c.text }, grid: { color: c.grid } },
                x: { ticks: { color: c.text }, grid: { display: false } }
            }
        }
    });

    if (chartProgress) chartProgress.destroy();
    chartProgress = new Chart(document.getElementById("chartProgress"), {
        type: "line",
        data: {
            labels: tasks.map(t => `#${t.id}`),
            datasets: [{
                label: "id задачи",
                data: tasks.map(t => t.id),
                borderColor: c.accent, backgroundColor: c.accentSoft,
                fill: true, tension: 0.35,
                pointRadius: 4, pointBackgroundColor: c.accent,
                pointBorderColor: "#fff", pointBorderWidth: 2
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: c.text }, grid: { color: c.grid } },
                x: { ticks: { color: c.text }, grid: { display: false } }
            }
        }
    });
}

// ---------- Экспорт (обёртка, чтобы вызывать exportData(filteredTasks, format)) ----------
function exportCurrent(format) {
    // используется кнопками CSV/JSON в HTML
    exportData(filteredTasks, format);
}
// В HTML мы оставили вызов exportData('csv') — сделаем алиас:
function exportDataFromButton(format) {
    exportData(filteredTasks, format);
}

// ---------- Logout ----------
function logout() {
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
    window.location.href = "/login.html";
}

// ---------- Тема: перерисовать графики ----------
window.__onThemeChange = () => {
    if (window.__tasks) renderCharts(window.__tasks);
};

// ---------- Инициализация ----------
document.addEventListener("DOMContentLoaded", () => {
    // показать сохранённый размер страницы в select
    const sel = document.getElementById("pageSize");
    if (sel) sel.value = String(pageSize);

    // аватар в шапке
    if (user) {
        document.getElementById("userChip").style.display = "inline-flex";
        document.getElementById("userName").textContent = user.login;
        renderAvatar(document.getElementById("userAvatar"), user.login, "sm");
    }

    updateThemeIcon();

    // модалка
    document.getElementById("editModal").addEventListener("click", e => {
        if (e.target.id === "editModal") closeEditModal();
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") closeEditModal();
    });

    // стартовая загрузка
    loadTasks();
    setInterval(loadTasks, 5000);
});