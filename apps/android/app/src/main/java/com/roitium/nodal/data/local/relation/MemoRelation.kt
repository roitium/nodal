package com.roitium.nodal.data.local.relation

import androidx.room.Embedded
import androidx.room.Relation
import com.roitium.nodal.data.local.entity.MemoEntity

/**
 * 项目内部流转使用的 Memo 对象
 * 包含 memo 和他的回复
 */
data class MemoPopulated(
    @Embedded val memo: MemoEntity,

    @Relation(
        parentColumn = "id",
        entityColumn = "parentId"
    )
    val replies: List<MemoEntity> = emptyList()
)