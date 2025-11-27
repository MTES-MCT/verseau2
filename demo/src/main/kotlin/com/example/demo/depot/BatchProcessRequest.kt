package com.example.demo.depot

data class DepotFileItem(
    val depotId: String,
    val pathFile: String
)

data class BatchProcessRequest(
    val items: List<DepotFileItem>
)
