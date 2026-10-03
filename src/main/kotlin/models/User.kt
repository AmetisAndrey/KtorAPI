package com.example.models

import kotlinx.serialization.Serializable

data class User(
    val id: Int,
    val login: String,
    val passwordHash: String
)

@Serializable
data class UserDto(
    val id: Int,
    val login: String
)

@Serializable
data class RegisterRequest(
    val login: String,
    val password: String
)

@Serializable
data class LoginRequest(
    val login: String,
    val password: String
)

@Serializable
data class AuthResponse(
    val token: String,
    val user: UserDto,
    val expiresInSeconds: Long
)