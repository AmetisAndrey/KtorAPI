package com.example.security

object JwtConfig {
    const val SECRET = "change-me-please-to-a-very-long-secret-at-least-32-bytes!!"
    const val ISSUER = "ktor-task-api"
    const val AUDIENCE = "ktor-task-api-users"
    const val REALM = "ktor-task-api"

    const val ACCESS_TOKEN_TTL_SECONDS = 3600L

    const val CLAIM_USER_ID = "userId"
    const val CLAIM_LOGIN = "login"
}