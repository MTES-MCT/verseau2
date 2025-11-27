package com.example.demo.depot

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "depot")
data class DepotEntity(
    @Id
    val id: String = UUID.randomUUID().toString(),
    val nomOriginalFichier: String,
    val tailleFichier: Long,
    val type: String,
    var path: String? = null,
    var error: String? = null
)
