package com.roitium.nodal.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

enum class SyncStatus {
    SYNCED,
    PENDING_CREATE,
    PENDING_UPDATE,
    PENDING_DELETE
}

@Entity(tableName = "memos")
data class MemoEntity(
    @PrimaryKey val id: String,
    val content: String,
    val createdTs: Long,
    val updatedTs: Long,
    val isPinned: Boolean,
    val status: SyncStatus
)