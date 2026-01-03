package com.roitium.nodal.data.local

import androidx.room.TypeConverter
import com.roitium.nodal.data.local.entity.SyncStatus

class Converters {
    @TypeConverter
    fun fromStatus(status: SyncStatus): String {
        return status.name
    }

    @TypeConverter
    fun toStatus(value: String): SyncStatus {
        return try {
            SyncStatus.valueOf(value) // 注意枚举值顺序不能随意改变
        } catch (e: IllegalArgumentException) {
            SyncStatus.SYNCED
        }
    }
}