package com.example.demo

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.boot.CommandLineRunner

@SpringBootApplication
@EnableScheduling
class DemoApplication
fun main(args: Array<String>) {
	runApplication<DemoApplication>(*args)
}