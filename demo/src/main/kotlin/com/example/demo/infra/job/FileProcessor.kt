package com.example.demo.infra.job

import com.example.demo.infra.s3.S3Service
import com.fasterxml.jackson.dataformat.xml.XmlMapper
import com.fasterxml.jackson.module.kotlin.KotlinModule
import org.jobrunr.jobs.annotations.Job
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import Depot

@Component
class FileProcessor(
    private val s3Service: S3Service
) {
    private val logger = LoggerFactory.getLogger(FileProcessor::class.java)

    private val xmlMapper = XmlMapper().apply {
        registerModule(KotlinModule.Builder().build())
        configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
    }

    @Job(name = "Process uploaded file", retries = 3)
    fun processFile(depotId: String, key: String) {
        val time = kotlin.system.measureTimeMillis {
            logger.info("Processing file for depot: $depotId, key: $key")

            try {
                logger.info("Downloading file from S3: $key")
                val fileContent = s3Service.download(key)
                logger.info("File downloaded, size: ${fileContent.size}")
                val startProcessTime = System.currentTimeMillis()
                parseFile(fileContent)
                val processDuration = System.currentTimeMillis() - startProcessTime

                logger.info("File processed in: $processDuration")
            } catch (e: Exception) {
                logger.error("Error processing file for depot: $depotId", e)
                throw e // Jobrunr will handle retries
            }
        }
        logger.info("File processing for depot: $depotId took $time ms")
    }

    private fun parseFile(content: ByteArray) {
        try {
            val depot = xmlMapper.readValue(content, Depot::class.java)
            logger.info("Successfully parsed XML file")
            logger.info("scenario Code: ${depot.scenario?.codeScenario}")
            logger.info("Emetteur Nom: ${depot.scenario?.emetteur?.nomIntervenant}")
            logger.info(
                "List of pointMesures: ${
                    depot.ouvrageDepollutions?.map {
                        it.pointMesures?.map { it.numeroPointMesure }
                    }
                } "
            )
            val depotSize = xmlMapper.writeValueAsBytes(depot).size
            logger.info("Depot object size: $depotSize bytes")
            // Show number of OuvrageDepollution and PointMesure
            logger.info("Number of OuvrageDepollution: ${depot.ouvrageDepollutions?.size}")
            logger.info("Number of PointMesure: ${depot.ouvrageDepollutions?.sumOf { it.pointMesures?.size ?: 0 }}")
        } catch (e: Exception) {
            logger.error("Failed to parse XML file", e)
            throw e
        }
    }
}
