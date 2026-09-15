package com.example.routes

import com.example.models.CreateTaskRequest
import com.example.models.ErrorResponse
import com.example.models.Task
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.util.concurrent.atomic.AtomicInteger

private val tasks = mutableListOf(
    Task(1, "Изучить Ktor", "Пройти туториал", false),
    Task(2, "Сделать ТЗ", "Реализовать все маршруты", true)
)
private val idGenerator = AtomicInteger(3)

fun Route.taskRoutes() {

    route("/tasks") {

        // GET /tasks?completed=true&limit=10
        get {
            val completedParam = call.request.queryParameters["completed"]
            val limitParam = call.request.queryParameters["limit"]

            var result = tasks.toList()

            completedParam?.let { value ->
                val completed = value.toBooleanStrictOrNull()
                if (completed == null) {
                    return@get call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("Параметр 'completed' должен быть true или false", 400)
                    )
                }
                result = result.filter { it.completed == completed }
            }

            limitParam?.let { value ->
                val limit = value.toIntOrNull()
                if (limit == null || limit <= 0) {
                    return@get call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("Параметр 'limit' должен быть положительным числом", 400)
                    )
                }
                result = result.take(limit)
            }

            call.respond(HttpStatusCode.OK, result)
        }

        // GET /tasks/{id}
        get("/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@get call.respond(
                    HttpStatusCode.BadRequest,
                    ErrorResponse("Некорректный id", 400)
                )

            val task = tasks.find { it.id == id }
                ?: return@get call.respond(
                    HttpStatusCode.NotFound,
                    ErrorResponse("Задача с id=$id не найдена", 404)
                )

            call.respond(HttpStatusCode.OK, task)
        }

        // POST /tasks
        post {
            val request = try {
                call.receive<CreateTaskRequest>()
            } catch (e: Exception) {
                return@post call.respond(
                    HttpStatusCode.BadRequest,
                    ErrorResponse("Некорректный JSON: ${e.message}", 400)
                )
            }

            if (request.title.isBlank()) {
                return@post call.respond(
                    HttpStatusCode.BadRequest,
                    ErrorResponse("Поле 'title' обязательно и не может быть пустым", 400)
                )
            }

            val newTask = Task(
                id = idGenerator.getAndIncrement(),
                title = request.title,
                description = request.description,
                completed = request.completed
            )
            tasks.add(newTask)

            call.respond(HttpStatusCode.Created, newTask)
        }

        // DELETE /tasks/{id}
        delete("/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@delete call.respond(
                    HttpStatusCode.BadRequest,
                    ErrorResponse("Некорректный id", 400)
                )

            val removed = tasks.removeIf { it.id == id }
            if (!removed) {
                return@delete call.respond(
                    HttpStatusCode.NotFound,
                    ErrorResponse("Задача с id=$id не найдена", 404)
                )
            }

            call.respond(HttpStatusCode.NoContent)
        }
    }
}