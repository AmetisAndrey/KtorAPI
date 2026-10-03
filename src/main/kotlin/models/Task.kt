package com.example.models

import kotlinx.serialization.Serializable

@Serializable
data class Task(
    val id: Int,
    val title: String,
    val description: String = "",
    val completed: Boolean = false,
    val ownerId: Int? = null
)

@Serializable
data class CreateTaskRequest(
    val title: String,
    val description: String = "",
    val completed: Boolean = false
)

@Serializable
data class UpdateTaskRequest(
    val title: String? = null,
    val description: String? = null,
    val completed: Boolean? = null
)

@Serializable
data class ErrorResponse(
    val error: String,
    val code: Int
)