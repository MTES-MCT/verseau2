package com.example.demo.config

import com.zaxxer.hikari.HikariDataSource
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import javax.sql.DataSource

@Configuration
class DatabaseConfig {

    @Bean
    fun dataSource(
        @Value("\${spring.datasource.url}") url: String,
        @Value("\${spring.datasource.username}") username: String,
        @Value("\${spring.datasource.password}") password: String,
        @Value("\${spring.datasource.hikari.maximum-pool-size}") maximumPoolSize: Int,
        @Value("\${spring.datasource.hikari.minimum-idle}") minimumIdle: Int,

        ): DataSource {
        println("!!!!!!!!!!!!!!!!!!!! Initializing DataSource !!!!!!!!!!!!!!!!!!!!")
        println("!!!!!!!!!!!!!!!!!!!! URL: $url")
        println("!!!!!!!!!!!!!!!!!!!! Username: $username")
        // Mask password for security, but show length/presence
        val passwordLog = if (password.isBlank()) "EMPTY/NULL" else "PRESENT (len=${password.length})"
        println("!!!!!!!!!!!!!!!!!!!! Password: $passwordLog")
        println("!!!!!!!!!!!!!!!!!!!! Maximum Pool Size: $maximumPoolSize")
        println("!!!!!!!!!!!!!!!!!!!! Minimum Idle: $minimumIdle")

        val dataSource = HikariDataSource()
        dataSource.jdbcUrl = url
        dataSource.username = username
        dataSource.password = password
        dataSource.driverClassName = "org.postgresql.Driver"

        dataSource.maximumPoolSize = maximumPoolSize
        dataSource.minimumIdle = minimumIdle

        dataSource.connectionTimeout = 30000
        dataSource.validationTimeout = 5000
        dataSource.maxLifetime = 600000 // 10 minutes - recycle before PostgreSQL closes them
        dataSource.keepaliveTime = 300000
        dataSource.leakDetectionThreshold = 60000

        // PostgreSQL-specific settings
        dataSource.connectionTestQuery = "SELECT 1"
        dataSource.addDataSourceProperty("socketTimeout", "30")
        dataSource.addDataSourceProperty("tcpKeepAlive", "true")

        return dataSource
    }
}
