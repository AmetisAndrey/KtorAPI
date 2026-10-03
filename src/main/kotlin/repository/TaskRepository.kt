package com.example.repository

import com.example.models.CreateTaskRequest
import com.example.models.Task
import com.example.models.UpdateTaskRequest
import java.util.concurrent.atomic.AtomicInteger

object TaskRepository {
    private val tasks = mutableListOf(
        Task(1, "Изучить Ktor", "Пройти туториал по серверу", false, ownerId = 1),
        Task(2, "Сделать ТЗ", "Реализовать CRUD + JWT", true, ownerId = 1)
    )
    private val idGen = AtomicInteger(3)

    fun all(): List<Task> = tasks.toList()

    fun findById(id: Int): Task? = tasks.find { it.id == id }

    fun create(req: CreateTaskRequest, ownerId: Int?): Task {
        val task = Task(
            id = idGen.getAndIncrement(),
            title = req.title,
            description = req.description,
            completed = req.completed,
            ownerId = ownerId
        )
        tasks.add(task)
        return task
    }

    fun update(id: Int, req: UpdateTaskRequest): Task? {
        val index = tasks.indexOfFirst { it.id == id }
        if (index == -1) return null
        val current = tasks[index]
        val updated = current.copy(
            title = req.title ?: current.title,
            description = req.description ?: current.description,
            completed = req.completed ?: current.completed
        )
        tasks[index] = updated
        return updated
    }

    fun delete(id: Int): Boolean = tasks.removeIf { it.id == id }
}