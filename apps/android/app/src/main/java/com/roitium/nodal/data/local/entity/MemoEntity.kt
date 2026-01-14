package com.roitium.nodal.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.roitium.nodal.data.models.Resource
import com.roitium.nodal.data.models.User
import kotlinx.serialization.Serializable

enum class SyncStatus {
    SYNCED,
    PENDING_CREATE,
    PENDING_UPDATE,
    PENDING_DELETE
}

@Entity(
    tableName = "memos",
    foreignKeys = [
        androidx.room.ForeignKey(
            entity = MemoEntity::class,
            parentColumns = ["id"],
            childColumns = ["parentId"],
            onDelete = androidx.room.ForeignKey.CASCADE
        )
    ],
    indices = [androidx.room.Index(value = ["parentId"])]
)
@Serializable
data class MemoEntity(
    @PrimaryKey val id: String,
    val content: String,

    val parentId: String? = null,
    val quotedMemo: MemoEntity? = null,

    val visibility: String = "public",
    val isPinned: Boolean = false,
    val createdAt: String,
    val updatedAt: String,

    val author: User? = null,
    val authorUsername: String,
    val resources: List<Resource> = emptyList(),

    @ColumnInfo(defaultValue = "0")
    val subReplyCount: Int = 0,

    val status: SyncStatus,
) {
    constructor() : this(
        id = "",
        content = "",
        createdAt = "",
        status = SyncStatus.SYNCED,
        updatedAt = "",
        authorUsername = ""
    )
}