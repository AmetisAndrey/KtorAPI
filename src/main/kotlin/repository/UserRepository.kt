package com.example.repository

import com.example.models.User
import java.util.concurrent.atomic.AtomicInteger

object UserRepository {
    private val users = mutableListOf<User>()
    private val idGen = AtomicInteger(1)

    fun findByLogin(login: String): User? =
        users.find { it.login.equals(login, ignoreCase = true) }

    fun findById(id: Int): User? = users.find { it.id == id }

    fun create(login: String, passwordHash: String): User {
        val user = User(idGen.getAndIncrement(), login, passwordHash)
        users.add(user)
        return user
    }
}