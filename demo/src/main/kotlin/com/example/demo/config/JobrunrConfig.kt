package com.example.demo.config

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.jobrunr.jobs.mappers.JobMapper
import org.jobrunr.utils.mapper.jackson.JacksonJsonMapper
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class JobrunrConfig {

    @Bean
    fun jobMapper(): JobMapper {
        // Create a separate ObjectMapper for JobRunr with its own configuration
        val jobRunrObjectMapper = jacksonObjectMapper()
        return JobMapper(JacksonJsonMapper(jobRunrObjectMapper))
    }
}
