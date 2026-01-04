package com.roitium.nodal.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "remote_cursors")
data class RemoteCursorEntity(
    @PrimaryKey val id: String,
    val nextCursorId: String?,
    val nextCursorTime: String? // createdAt
)