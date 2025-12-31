package com.roitium.nodal.utils

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

fun formatIsoDateToGroupHeader(isoString: String): String {
    try {
        val instant = Instant.parse(isoString)

        val zoneId = ZoneId.systemDefault()
        val itemDate = instant.atZone(zoneId).toLocalDate()
        val today = LocalDate.now(zoneId)

        return when {
            itemDate.isEqual(today) -> "今天"
            itemDate.isEqual(today.minusDays(1)) -> "昨天"
            else -> itemDate.format(DateTimeFormatter.ofPattern("yyyy年MM月dd日"))
        }
    } catch (e: Exception) {
        return isoString
    }
}