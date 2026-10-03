package com.example

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.example.routes.authRoutes
import com.example.routes.taskRoutes
import com.example.security.JwtConfig
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.engine.*
import io.ktor.server.http.content.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.callloging.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.Json
import org.slf4j.event.Level

fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0", module = Application::module)
        .start(wait = true)
}

fun Application.module() {

    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
            encodeDefaults = true
        })
    }

    install(CallLogging) { level = Level.INFO }

    install(Authentication) {
        jwt("auth-jwt") {
            realm = JwtConfig.REALM
            verifier(
                JWT.require(Algorithm.HMAC256(JwtConfig.SECRET))
                    .withIssuer(JwtConfig.ISSUER)
                    .withAudience(JwtConfig.AUDIENCE)
                    .build()
            )
            validate { credential ->
                val userId = credential.payload.getClaim(JwtConfig.CLAIM_USER_ID).asInt()
                if (userId != null && userId > 0) JWTPrincipal(credential.payload) else null
            }
            challenge { _, _ ->
                call.respond(
                    HttpStatusCode.Unauthorized,
                    mapOf(
                        "error" to "Требуется валидный JWT в заголовке Authorization: Bearer",
                        "code" to 401
                    )
                )
            }
        }
    }

    install(StatusPages) {
        exception<Throwable> { call, cause ->
            call.respond(
                HttpStatusCode.InternalServerError,
                mapOf(
                    "error" to (cause.message ?: "Внутренняя ошибка сервера"),
                    "code" to 500
                )
            )
        }
        status(HttpStatusCode.NotFound) { call, _ ->
            call.respond(
                HttpStatusCode.NotFound,
                mapOf("error" to "Маршрут не найден", "code" to 404)
            )
        }
    }

    routing {
        staticResources("/", "static") {
            default("dashboard.html")
        }

        get("/api/health") {
            call.respond(mapOf("status" to "ok"))
        }

        authRoutes()
        taskRoutes()
    }
}