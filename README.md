# Ktor Task API

Учебный REST API на Ktor с JSON-сериализацией (kotlinx.serialization).

## Требования
- JDK 17+
- Gradle 8+

## Запуск
```bash
./gradlew run
```
Сервер поднимется на `http://localhost:8080`.

## Эндпоинты

| Метод  | Путь                       | Описание                               |
|--------|----------------------------|----------------------------------------|
| GET    | `/`                        | Health-check                           |
| GET    | `/tasks`                   | Список задач (query: `completed`, `limit`) |
| GET    | `/tasks/{id}`              | Задача по id                           |
| POST   | `/tasks`                   | Создать задачу (JSON body)             |
| DELETE | `/tasks/{id}`              | Удалить задачу по id                   |

## Примеры

```bash
# Получить все задачи
curl http://localhost:8080/tasks

# Фильтр + лимит
curl "http://localhost:8080/tasks?completed=false&limit=5"

# Задача по id
curl http://localhost:8080/tasks/1

# Создать
curl -X POST http://localhost:8080/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Новая задача","description":"Описание"}'

# Удалить
curl -X DELETE http://localhost:8080/tasks/1
```

## HTTP-коды
- `200 OK` — успешный GET
- `201 Created` — задача создана
- `204 No Content` — задача удалена
- `400 Bad Request` — ошибка валидации / параметров
- `404 Not Found` — ресурс не найден
- `500 Internal Server Error` — внутренняя ошибка

## Структура
```
src/main/kotlin/com/example/
├── Application.kt
├── models/Task.kt
└── routes/TaskRoutes.kt
```
