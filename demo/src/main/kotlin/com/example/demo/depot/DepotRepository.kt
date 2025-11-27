package com.example.demo.depot

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import com.example.demo.depot.DepotEntity

@Repository
interface DepotRepository : JpaRepository<DepotEntity, String>
