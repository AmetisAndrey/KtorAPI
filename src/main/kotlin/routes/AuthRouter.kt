package com.example.routes

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.example.models.*
import com.example.repository.UserRepository
import com.example.security.JwtConfig
import com.example.security.PasswordHasher
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.util.Date

fun Route.authRoutes() {

    route("/auth") {

        // POST /auth/register
        post("/register") {
            val req = try {
                call.receive<RegisterRequest>()
            } catch (e: Exception) {
                return@post call.respond(
                    HttpStatusCode.BadRequest,
                    ErrorResponse("Некорректный JSON: ${e.message}", 400)
                )
            }

            if (req.login.isBlank() || req.password.isBlank()) {
                return@post call.respond(
                    HttpStatusCode.BadRequest,
                    ErrorResponse("Поля 'login' и 'password' обязательны", 400)
                )
            }
            if (req.password.length < 6) {
                return@post call.respond(
                    HttpStatusCode.BadRequest,
                    ErrorResponse("Пароль должен содержать минимум 6 символов", 400)
                )
            }
            if (UserRepository.findByLogin(req.login) != null) {
                return@post call.respond(
                    HttpStatusCode.Conflict,
                    ErrorResponse("Пользователь с логином '${req.login}' уже существует", 409)
                )
            }

            val hash = PasswordHasher.hash(req.password)
            val user = UserRepository.create(req.login, hash)

            call.respond(HttpStatusCode.Created, UserDto(user.id, user.login))
        }

        // POST /auth/login
        post("/login") {
            val req = try {
                call.receive<LoginRequest>()
            } catch (e: Exception) {
                return@post call.respond(
                    HttpStatusCode.BadRequest,
                    ErrorResponse("Некорректный JSON: ${e.message}", 400)
                )
            }

            val user = UserRepository.findByLogin(req.login)
                ?: return@post call.respond(
                    HttpStatusCode.Unauthorized,
                    ErrorResponse("Неверный логин или пароль", 401)
                )

            if (!PasswordHasher.verify(req.password, user.passwordHash)) {
                return@post call.respond(
                    HttpStatusCode.Unauthorized,
                    ErrorResponse("Неверный логин или пароль", 401)
                )
            }

            val now = System.currentTimeMillis()
            val expiresAt = Date(now + JwtConfig.ACCESS_TOKEN_TTL_SECONDS * 1000)

            val token = JWT.create()
                .withIssuer(JwtConfig.ISSUER)
                .withAudience(JwtConfig.AUDIENCE)
                .withClaim(JwtConfig.CLAIM_USER_ID, user.id)
                .withClaim(JwtConfig.CLAIM_LOGIN, user.login)
                .withIssuedAt(Date(now))
                .withExpiresAt(expiresAt)
                .sign(Algorithm.HMAC256(JwtConfig.SECRET))

            call.respond(
                HttpStatusCode.OK,
                AuthResponse(
                    token = token,
                    user = UserDto(user.id, user.login),
                    expiresInSeconds = JwtConfig.ACCESS_TOKEN_TTL_SECONDS
                )
            )
        }
    }
}