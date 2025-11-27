package com.example.demo.infra.job

import org.jobrunr.scheduling.BackgroundJob
import org.springframework.stereotype.Service

@Service
class BackgroundJobService {
    fun enqueueFileProcessing(depotId: String, key: String) {
        BackgroundJob.enqueue<FileProcessor> { processor ->
            processor.processFile(depotId, key) 
        }
    }
}
