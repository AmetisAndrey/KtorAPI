# Ktor Task API

Backend-приложение на Kotlin/Ktor: CRUD для сущности «Задача» + регистрация, вход и JWT-аутентификация. Есть веб-интерфейс (дашборд с графиками, поиском, сортировкой, пагинацией, экспортом CSV/JSON и переключением тем).

## Содержание

- [Стек](#стек)
- [Требования](#требования)
- [Запуск](#запуск)
- [Структура проекта](#структура-проекта)
- [Аутентификация](#аутентификация)
- [Маршруты](#маршруты)
  - [POST /auth/register](#post-authregister)
  - [POST /auth/login](#post-authlogin)
  - [GET /tasks](#get-tasks)
  - [GET /tasks/{id}](#get-tasksid)
  - [POST /tasks](#post-tasks)
  - [PUT /tasks/{id}](#put-tasksid)
  - [DELETE /tasks/{id}](#delete-tasksid)
  - [GET /api/health](#get-apihealth)
- [Коды ответов](#коды-ответов)
- [Веб-интерфейс](#веб-интерфейс)
- [Безопасность](#безопасность)
- [Тестирование через PowerShell](#тестирование-через-powershell)

---

## Стек

- **Kotlin 1.9.22** + **Ktor 2.3.12** (Netty)
- **kotlinx.serialization** + `ContentNegotiation` (JSON)
- **JWT** (`ktor-server-auth-jwt`, HMAC256)
- **BCrypt** (`at.favre.lib:bcrypt`, cost 12)
- **Gradle 8+** (проект проверен на Gradle 8.14 и 9.5)
- **JDK 17+**

## Требования

- JDK 17 или новее
- Git
- Не требуются: Docker, Postgres, внешняя БД — данные хранятся в памяти.

Проверить версию JDK:

```bash
java -version
```

## Запуск

### Windows (PowerShell)

```powershell
.\gradlew.bat run
```

### Linux / macOS

```bash
./gradlew run
```

После старта в консоли появится:

```
INFO  Application - Responding at http://0.0.0.0:8080
```

Сервер доступен по адресу: **http://localhost:8080**

### Первый запуск

Первый запуск скачивает зависимости (Ktor, Netty, BCrypt и т.д.) — может занять 1–3 минуты. Последующие запуски быстрые.

### Остановка

`Ctrl + C` в окне терминала, где запущен Gradle.

## Структура проекта

```
ktor/
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── README.md
└── src/main/
    ├── kotlin/com/example/
    │   ├── Application.kt          # точка входа, плагины, маршрутизация
    │   ├── models/
    │   │   ├── Task.kt             # Task, CreateTaskRequest, UpdateTaskRequest, ErrorResponse
    │   │   └── User.kt             # User, UserDto, RegisterRequest, LoginRequest, AuthResponse
    │   ├── repositories/
    │   │   ├── TaskRepository.kt   # in-memory хранилище задач
    │   │   └── UserRepository.kt   # in-memory хранилище пользователей
    │   ├── security/
    │   │   ├── JwtConfig.kt        # секрет, issuer, audience, claim-имена
    │   │   └── PasswordHasher.kt   # BCrypt hash/verify
    │   └── routes/
    │       ├── AuthRouter.kt       # /auth/register, /auth/login
    │       └── TaskRouter.kt       # CRUD /tasks
    └── resources/
        ├── logback.xml
        └── static/
            ├── login.html
            ├── dashboard.html
            ├── css/
            │   ├── base.css
            │   ├── auth.css
            │   └── dashboard.css
            └── js/
                ├── shared.js
                ├── auth.js
                └── dashboard.js
```

## Аутентификация

- **Регистрация**: `POST /auth/register` — принимает `login` и `password`, пароль хэшируется BCrypt.
- **Вход**: `POST /auth/login` — проверяет пароль сверкой с хэшем и возвращает JWT.
- **Токен** содержит claims `userId` и `login`, issuer `ktor-task-api`, audience `ktor-task-api-users`, срок жизни 1 час.
- **Защищённые маршруты** требуют заголовок:
  ```
  Authorization: Bearer <TOKEN>
  ```
- **Публичные маршруты**: `GET /tasks`, `GET /tasks/{id}`, `POST /auth/register`, `POST /auth/login`, `GET /api/health`.

Получить токен:

```bash
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"ametis","password":"secret123"}'
```

Ответ:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "id": 1, "login": "ametis" },
  "expiresInSeconds": 3600
}
```

## Маршруты

### POST /auth/register

Регистрация нового пользователя.

**Тело запроса**

```json
{ "login": "ametis", "password": "secret123" }
```

**Успех** — `201 Created`

```json
{ "id": 1, "login": "ametis" }
```

**Ошибки**
- `400 Bad Request` — пустой логин/пароль или пароль короче 6 символов
- `409 Conflict` — логин уже занят

**curl**

```bash
curl -i -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"login":"ametis","password":"secret123"}'
```

**PowerShell**

```powershell
Invoke-RestMethod -Uri http://localhost:8080/auth/register -Method Post `
  -ContentType "application/json" `
  -Body '{"login":"ametis","password":"secret123"}'
```

---

### POST /auth/login

Вход и получение JWT.

**Тело запроса**

```json
{ "login": "ametis", "password": "secret123" }
```

**Успех** — `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "id": 1, "login": "ametis" },
  "expiresInSeconds": 3600
}
```

**Ошибки**
- `400 Bad Request` — некорректный JSON
- `401 Unauthorized` — неверный логин или пароль

**curl**

```bash
curl -i -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"ametis","password":"secret123"}'
```

**PowerShell** — сохраняем токен в переменную

```powershell
$resp = Invoke-RestMethod -Uri http://localhost:8080/auth/login -Method Post `
  -ContentType "application/json" `
  -Body '{"login":"ametis","password":"secret123"}'

$token = $resp.token
$h = @{ Authorization = "Bearer $token" }
```

---

### GET /tasks

Публичный. Список задач. Поддерживает query-параметры.

**Query-параметры**
- `completed` — `true` / `false` (фильтр по статусу)
- `limit` — положительное целое (ограничение количества)

**Успех** — `200 OK`

```json
[
  { "id": 1, "title": "Изучить Ktor", "description": "Пройти туториал", "completed": false, "ownerId": 1 },
  { "id": 2, "title": "Сделать ТЗ", "description": "Реализовать CRUD + JWT", "completed": true, "ownerId": 1 }
]
```

**Ошибки**
- `400 Bad Request` — некорректный `completed` или `limit`

**curl**

```bash
# Все задачи
curl http://localhost:8080/tasks

# Только невыполненные, не более 5
curl "http://localhost:8080/tasks?completed=false&limit=5"
```

**PowerShell**

```powershell
Invoke-RestMethod http://localhost:8080/tasks
Invoke-RestMethod "http://localhost:8080/tasks?completed=false&limit=5"
```

---

### GET /tasks/{id}

Публичный. Одна задача по id.

**Путь**: `id` — целое число.

**Успех** — `200 OK`

```json
{ "id": 1, "title": "Изучить Ktor", "description": "Пройти туториал", "completed": false, "ownerId": 1 }
```

**Ошибки**
- `400 Bad Request` — `id` не число
- `404 Not Found` — задача не найдена

**curl**

```bash
curl -i http://localhost:8080/tasks/1
```

**PowerShell**

```powershell
Invoke-RestMethod http://localhost:8080/tasks/1
```

---

### POST /tasks

**Требует JWT** в заголовке `Authorization: Bearer <TOKEN>`.

**Тело запроса** (DTO без `id`)

```json
{ "title": "Купить молоко", "description": "2 литра", "completed": false }
```

`description` и `completed` опциональны.

**Успех** — `201 Created`

```json
{ "id": 3, "title": "Купить молоко", "description": "2 литра", "completed": false, "ownerId": 1 }
```

**Ошибки**
- `400 Bad Request` — пустой `title` или некорректный JSON
- `401 Unauthorized` — нет или невалидный JWT

**curl**

```bash
curl -i -X POST http://localhost:8080/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Купить молоко","description":"2 литра"}'
```

**PowerShell**

```powershell
Invoke-RestMethod -Uri http://localhost:8080/tasks -Method Post -Headers $h `
  -ContentType "application/json" `
  -Body '{"title":"Купить молоко","description":"2 литра"}'
```

---

### PUT /tasks/{id}

**Требует JWT**.

**Путь**: `id` — целое число.

**Тело запроса** (DTO обновления; любое поле можно опустить)

```json
{ "completed": true }
```

Возможные поля: `title`, `description`, `completed`.

**Успех** — `200 OK`

```json
{ "id": 1, "title": "Изучить Ktor", "description": "Пройти туториал", "completed": true, "ownerId": 1 }
```

**Ошибки**
- `400 Bad Request` — некорректный JSON или `id`
- `401 Unauthorized` — нет или невалидный JWT
- `404 Not Found` — задача не найдена

**curl**

```bash
# Отметить выполненной
curl -i -X PUT http://localhost:8080/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"completed":true}'

# Изменить описание
curl -i -X PUT http://localhost:8080/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"description":"Новое описание"}'
```

**PowerShell**

```powershell
Invoke-RestMethod -Uri http://localhost:8080/tasks/1 -Method Put -Headers $h `
  -ContentType "application/json" `
  -Body '{"completed":true}'
```

---

### DELETE /tasks/{id}

**Требует JWT**.

**Путь**: `id` — целое число.

**Успех** — `204 No Content` (тело пустое)

**Ошибки**
- `400 Bad Request` — некорректный `id`
- `401 Unauthorized` — нет или невалидный JWT
- `404 Not Found` — задача не найдена

**curl**

```bash
curl -i -X DELETE http://localhost:8080/tasks/1 \
  -H "Authorization: Bearer $TOKEN"
```

**PowerShell**

```powershell
(Invoke-WebRequest -Uri http://localhost:8080/tasks/1 -Method Delete -Headers $h).StatusCode
```

---

### GET /api/health

Публичный health-check.

**Успех** — `200 OK`

```json
{ "status": "ok" }
```

**curl**

```bash
curl http://localhost:8080/api/health
```

---

## Коды ответов

| Код | Когда возвращается |
|-----|--------------------|
| 200 | Успешный GET / PUT / POST /auth/login |
| 201 | Задача создана / пользователь зарегистрирован |
| 204 | Задача удалена |
| 400 | Некорректный JSON, пустые обязательные поля, неверные query-параметры или `id` |
| 401 | Нет или невалидный JWT; неверный логин/пароль |
| 404 | Задача или маршрут не найдены |
| 409 | Логин уже занят |
| 500 | Внутренняя ошибка сервера |

Все ответы — в формате JSON, кроме `204 No Content`.

Формат ошибки:

```json
{ "error": "Описание ошибки", "code": 400 }
```

---

## Веб-интерфейс

После запуска сервера откройте в браузере:

- **http://localhost:8080/** — редирект на дашборд, без токена → на страницу входа.
- **http://localhost:8080/login.html** — вход / регистрация.
- **http://localhost:8080/dashboard.html** — дашборд.

Возможности дашборда:

- метрики: всего задач, выполнено, в работе, процент;
- три графика (Chart.js): статус, длина названий, динамика по id;
- создание задачи с названием и описанием;
- переключение статуса «Выполнено / Вернуть»;
- редактирование через модальное окно;
- удаление с подтверждением;
- поиск по названию/описанию;
- фильтр по статусу;
- сортировка по клику на заголовок столбца (id / название / описание / статус);
- пагинация с настройкой размера страницы (5 / 10 / 25 / 50 / Все);
- экспорт текущего отфильтрованного списка в **CSV** и **JSON**;
- светлая/тёмная тема с сохранением выбора;
- автообновление данных каждые 5 секунд;
- JWT хранится в `localStorage`, при истечении — автоматический выход на страницу входа.

---

## Безопасность

- **Пароли** хранятся только в виде BCrypt-хэшей (`at.favre.lib:bcrypt`, cost = 12).
- **Проверка пароля** при входе — через `BCrypt.verifyer().verify(...)`, а не сравнение строк.
- **JWT** подписан HMAC256; секрет задаётся в `security/JwtConfig.kt` (для продакшена заменить на значение из переменной окружения).
- Токен содержит полезные claims: `userId`, `login`, а также `iss`, `aud`, `iat`, `exp`.
- **Защищённые маршруты** (`POST/PUT/DELETE /tasks`) требуют валидный токен; без него или при его недействительности возвращается `401 Unauthorized`.
- Пароль никогда не возвращается клиенту: в ответе `/auth/login` передаётся только `UserDto(id, login)`.

---

## Тестирование через PowerShell

Готовый сценарий — от регистрации до удаления.

```powershell
# 1. Регистрация
Invoke-RestMethod -Uri http://localhost:8080/auth/register -Method Post `
  -ContentType "application/json" `
  -Body '{"login":"ametis","password":"secret123"}'

# 2. Логин — сохраняем токен
$resp = Invoke-RestMethod -Uri http://localhost:8080/auth/login -Method Post `
  -ContentType "application/json" `
  -Body '{"login":"ametis","password":"secret123"}'
$h = @{ Authorization = "Bearer $($resp.token)" }

# 3. Публичное чтение
Invoke-RestMethod http://localhost:8080/tasks
Invoke-RestMethod http://localhost:8080/tasks/1

# 4. Создание с токеном
Invoke-RestMethod -Uri http://localhost:8080/tasks -Method Post -Headers $h `
  -ContentType "application/json" `
  -Body '{"title":"Новая задача","description":"Описание"}'

# 5. Обновление
Invoke-RestMethod -Uri http://localhost:8080/tasks/1 -Method Put -Headers $h `
  -ContentType "application/json" `
  -Body '{"completed":true}'

# 6. Удаление — проверяем 204
(Invoke-WebRequest -Uri http://localhost:8080/tasks/1 -Method Delete -Headers $h).StatusCode

# 7. Проверка защиты: 401 без токена
try {
  Invoke-RestMethod -Uri http://localhost:8080/tasks -Method Post `
    -ContentType "application/json" -Body '{"title":"Без токена"}'
} catch {
  $_.Exception.Response.StatusCode.value__   # должно быть 401
}
```