package com.roitium.nodal.data.local.entity

import android.util.Log
import com.roitium.nodal.data.models.ApiMemo
import com.roitium.nodal.data.models.ApiQuotedMemo
import com.roitium.nodal.data.models.ApiReplyMemo

fun ApiMemo.toFlattenEntityList(): List<MemoEntity> {
    Log.d("quoteMemo", this.toString())
    val resultList = mutableListOf<MemoEntity>()

    resultList.add(this.toSingleEntity())

    this.replies.forEach {
        val replyEntity = it.toSingleEntity()
        resultList.add(replyEntity)

        // 记得还需要转换评论的引用 memo！！！！！！！
        it.quotedMemo?.let { nestedQuote ->
            // 我们在这里不需要再使用 toFlattenEntityList 了，因为 API 压根不会返回 quotedMemo 的 replies 字段
            resultList.add(nestedQuote.toSingleEntity())
        }
    }

    this.quotedMemo?.let {
        resultList.add(it.toSingleEntity())
    }

    return resultList
}

fun ApiMemo.toSingleEntity(): MemoEntity {
    return MemoEntity(
        id = this.id,
        content = this.content,

        authorUsername = this.author.username,
        author = this.author,

        parentId = this.parentId,
        quotedMemo = this.quotedMemo?.toSingleEntity(),
        subReplyCount = this.replies.size,

        createdAt = this.createdAt,
        visibility = this.visibility,
        isPinned = this.isPinned,
        resources = this.resources,
        updatedAt = this.updatedAt,
        status = SyncStatus.SYNCED
    )
}

fun ApiQuotedMemo.toSingleEntity(): MemoEntity {
    return MemoEntity(
        id = this.id,
        content = this.content,

        authorUsername = this.author.username,
        author = this.author,

        parentId = this.parentId,

        createdAt = this.createdAt,
        visibility = this.visibility,
        isPinned = this.isPinned,
        updatedAt = this.updatedAt,
        status = SyncStatus.SYNCED
    )
}

fun ApiReplyMemo.toSingleEntity(): MemoEntity {
    return MemoEntity(
        id = this.id,
        content = this.content,

        authorUsername = this.author.username,
        author = this.author,

        parentId = this.parentId,
        quotedMemo = this.quotedMemo?.toSingleEntity(),
        subReplyCount = this.subReplyCount ?: 0,

        createdAt = this.createdAt,
        visibility = this.visibility,
        isPinned = this.isPinned,
        resources = this.resources,
        updatedAt = this.updatedAt,
        status = SyncStatus.SYNCED
    )
}