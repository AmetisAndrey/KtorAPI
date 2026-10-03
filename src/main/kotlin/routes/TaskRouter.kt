package com.example.routes

import com.example.models.*
import com.example.repository.TaskRepository
import com.example.security.JwtConfig
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.taskRoutes() {

    route("/tasks") {

        // ---------- ПУБЛИЧНЫЕ ----------

        // GET /tasks?completed=true&limit=5
        get {
            val completedParam = call.request.queryParameters["completed"]
            val limitParam = call.request.queryParameters["limit"]

            var result = TaskRepository.all()

            if (completedParam != null) {
                val completed = completedParam.toBooleanStrictOrNull()
                    ?: return@get call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("Параметр 'completed' должен быть true или false", 400)
                    )
                result = result.filter { it.completed == completed }
            }
            if (limitParam != null) {
                val limit = limitParam.toIntOrNull()
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

            val task = TaskRepository.findById(id)
                ?: return@get call.respond(
                    HttpStatusCode.NotFound,
                    ErrorResponse("Задача с id=$id не найдена", 404)
                )

            call.respond(HttpStatusCode.OK, task)
        }

        // ---------- ЗАЩИЩЁННЫЕ (JWT) ----------

        authenticate("auth-jwt") {

            // POST /tasks
            post {
                val principal = call.principal<JWTPrincipal>()
                val userId = principal?.payload?.getClaim(JwtConfig.CLAIM_USER_ID)?.asInt()

                val req = try {
                    call.receive<CreateTaskRequest>()
                } catch (e: Exception) {
                    return@post call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("Некорректный JSON: ${e.message}", 400)
                    )
                }

                if (req.title.isBlank()) {
                    return@post call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("Поле 'title' обязательно", 400)
                    )
                }

                val created = TaskRepository.create(req, ownerId = userId)
                call.respond(HttpStatusCode.Created, created)
            }

            // PUT /tasks/{id}
            put("/{id}") {
                val id = call.parameters["id"]?.toIntOrNull()
                    ?: return@put call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("Некорректный id", 400)
                    )

                val req = try {
                    call.receive<UpdateTaskRequest>()
                } catch (e: Exception) {
                    return@put call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("Некорректный JSON: ${e.message}", 400)
                    )
                }

                val updated = TaskRepository.update(id, req)
                    ?: return@put call.respond(
                        HttpStatusCode.NotFound,
                        ErrorResponse("Задача с id=$id не найдена", 404)
                    )

                call.respond(HttpStatusCode.OK, updated)
            }

            // DELETE /tasks/{id}
            delete("/{id}") {
                val id = call.parameters["id"]?.toIntOrNull()
                    ?: return@delete call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse("Некорректный id", 400)
                    )

                val removed = TaskRepository.delete(id)
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
}