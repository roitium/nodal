package com.roitium.nodal.data.local

import androidx.room.TypeConverter
import com.roitium.nodal.data.local.entity.MemoEntity
import com.roitium.nodal.data.local.entity.SyncStatus
import com.roitium.nodal.data.models.Resource
import com.roitium.nodal.data.models.User
import kotlinx.serialization.json.Json

class Converters {
    @TypeConverter
    fun fromStatus(status: SyncStatus): String {
        return status.name
    }

    @TypeConverter
    fun toStatus(value: String): SyncStatus {
        return try {
            SyncStatus.valueOf(value)
        } catch (e: IllegalArgumentException) {
            SyncStatus.SYNCED
        }
    }

    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        encodeDefaults = true
    }

    @TypeConverter
    fun fromUser(user: User?): String? {
        return user?.let { json.encodeToString(it) }
    }

    @TypeConverter
    fun toUser(data: String?): User? {
        return data?.let { json.decodeFromString(it) }
    }

    @TypeConverter
    fun fromResourceList(list: List<Resource>?): String {
        return json.encodeToString(list ?: emptyList())
    }

    @TypeConverter
    fun toResourceList(data: String?): List<Resource> {
        return if (data.isNullOrEmpty()) emptyList() else json.decodeFromString(data)
    }

    @TypeConverter
    fun fromMemoEntity(memo: MemoEntity?): String? {
        return memo?.let { json.encodeToString(it) }
    }

    @TypeConverter
    fun toMemoEntity(jsonString: String?): MemoEntity? {
        return jsonString?.let { json.decodeFromString<MemoEntity>(it) }
    }
}