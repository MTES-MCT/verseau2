package com.example.demo.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.CommandLineRunner
import org.springframework.stereotype.Component
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.CreateBucketRequest
import software.amazon.awssdk.services.s3.model.HeadBucketRequest

@Component
class BucketInitializer(
    private val s3Client: S3Client,
    @Value("\${aws.s3.bucket}") private val bucketName: String
) : CommandLineRunner {

    override fun run(vararg args: String) {
        var retries = 10
        while (retries > 0) {
            try {
                s3Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build())
                println("Bucket $bucketName already exists.")
                return
            } catch (e: Exception) {
                if (e.message?.contains("does not exist") == true || e is software.amazon.awssdk.services.s3.model.NoSuchBucketException) {
                    try {
                        println("Bucket $bucketName does not exist. Creating...")
                        s3Client.createBucket(CreateBucketRequest.builder().bucket(bucketName).build())
                        println("Bucket $bucketName created.")
                        return
                    } catch (createEx: Exception) {
                         println("Failed to create bucket: ${createEx.message}. Retrying...")
                    }
                } else {
                    println("Failed to connect to S3: ${e.message}. Retrying in 2s...")
                }
            }
            Thread.sleep(2000)
            retries--
        }
        throw RuntimeException("Failed to initialize S3 bucket after retries")
    }
}
