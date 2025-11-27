package com.example.demo.depot

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/depot")
class DepotController(
    private val depotService: DepotService
) {

    @PostMapping("/upload")
    fun uploadFile(@RequestParam("file") file: MultipartFile): ResponseEntity<DepotEntity> {
        val depot = depotService.uploadFile(file)
        return ResponseEntity.ok(depot)
    }

    @PostMapping("/batch-process")
    fun batchProcess(@RequestBody request: BatchProcessRequest): ResponseEntity<Map<String, Any>> {
        val result = depotService.processBatch(request)
        return ResponseEntity.ok(result)
    }
}
