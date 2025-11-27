package com.example.demo.depot

import com.example.demo.infra.job.BackgroundJobService
import com.example.demo.infra.s3.S3Service
import com.example.demo.depot.DepotEntity
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile

@Service
class DepotService(
    private val depotRepository: DepotRepository,
    private val s3Service: S3Service,
    private val backgroundJobService: BackgroundJobService
) {

    private val logger = LoggerFactory.getLogger(DepotService::class.java)

    fun uploadFile(file: MultipartFile): DepotEntity {
        val depot = DepotEntity(
            nomOriginalFichier = file.originalFilename ?: "unknown",
            tailleFichier = file.size,
            type = file.contentType ?: "application/octet-stream"
        )
        val savedDepot = depotRepository.save(depot)
        val key = "${depot.id}_${depot.nomOriginalFichier}"

        try {
            logger.info("Uploading file to S3: $key")
            s3Service.upload(key, file.bytes, depot.type)
            depot.path = key
            depotRepository.save(depot)
            logger.info("File uploaded to S3")

            logger.info("Enqueuing background job for file processing")
            backgroundJobService.enqueueFileProcessing(depot.id, key)
            logger.info("Background job enqueued")

        } catch (e: Exception) {
            logger.error("Error processing file upload", e)
            depot.error = e.message
            depotRepository.save(depot)
            throw e
        }

        return depot
    }

    fun processBatch(request: BatchProcessRequest): Map<String, Any> {
        logger.info("Processing batch of ${request.items.size} items")

        val results = mutableListOf<Map<String, String>>()

        request.items.forEach { item ->
            try {
                logger.info("Enqueuing background job for depotId: ${item.depotId}, pathFile: ${item.pathFile}")
                backgroundJobService.enqueueFileProcessing(item.depotId, item.pathFile)
                results.add(
                    mapOf(
                        "depotId" to item.depotId,
                        "pathFile" to item.pathFile,
                        "status" to "enqueued"
                    )
                )
                logger.info("Successfully enqueued job for depotId: ${item.depotId}")
            } catch (e: Exception) {
                logger.error("Error enqueuing job for depotId: ${item.depotId}", e)
                results.add(
                    mapOf(
                        "depotId" to item.depotId,
                        "pathFile" to item.pathFile,
                        "status" to "failed",
                        "error" to (e.message ?: "Unknown error")
                    )
                )
            }
        }

        return mapOf(
            "totalItems" to request.items.size,
            "results" to results
        )
    }
}
