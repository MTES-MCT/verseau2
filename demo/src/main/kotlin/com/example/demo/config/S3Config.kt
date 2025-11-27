package com.example.demo.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import java.net.URI

@Configuration
class S3Config {

    @Bean
    fun s3Client(
        @Value("\${aws.s3.endpoint}") endpoint: String,
        @Value("\${aws.s3.region}") region: String,
        @Value("\${aws.s3.access-key}") accessKey: String,
        @Value("\${aws.s3.secret-key}") secretKey: String
    ): S3Client {
        return S3Client.builder()
            .endpointOverride(URI.create(endpoint))
            .region(Region.of(region))
            .credentialsProvider(
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey, secretKey)
                )
            )
            .forcePathStyle(true)
            .build()
    }
}
