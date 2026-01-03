package com.roitium.nodal.data.repository

import com.roitium.nodal.data.api.NodalMemoApi
import com.roitium.nodal.data.local.dao.MemoDao
import com.roitium.nodal.data.models.ApiResult
import com.roitium.nodal.data.models.Cursor
import com.roitium.nodal.data.models.Memo
import com.roitium.nodal.data.models.PatchQuoteMemoField
import com.roitium.nodal.data.models.PublishRequest
import com.roitium.nodal.data.models.Resource
import com.roitium.nodal.data.models.TimelineResponse
import com.roitium.nodal.exceptions.BusinessException
import jakarta.inject.Inject
import jakarta.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlin.time.Instant

@Singleton
class MemoRepository @Inject constructor(
    private val dao: MemoDao,
    private val memoApi: NodalMemoApi
) {
    private val _memoEntities = MutableStateFlow<Map<String, Memo>>(emptyMap())
    private val _personalTimeline = MutableStateFlow<Map<String, List<String>>>(emptyMap())
    private val _exploreTimeline = MutableStateFlow<List<String>>(emptyList())

    var exploreTimelineCursor: Cursor? = null
    var personalTimelineCursor: MutableMap<String, Cursor?> = mutableMapOf()

    private fun updateEntities(memos: List<Memo>) {
        _memoEntities.update { current -> current + memos.associateBy { it.id } }
    }

    fun getTimelineFlow(username: String?): Flow<List<Memo>> {
        if (username == null) {
            return _exploreTimeline.combine(_memoEntities) { ids, entities ->
                ids.mapNotNull { entities[it] }
            }
        }
        return _personalTimeline.map { it[username] ?: emptyList() }
            .combine(_memoEntities) { ids, entities ->
                ids.mapNotNull { entities[it] }
            }
    }

    suspend fun fetchTimeline(username: String? = null, isRefresh: Boolean): TimelineResponse {
        var cursor: Cursor? = if (!isRefresh) {
            if (username == null) exploreTimelineCursor else personalTimelineCursor[username]
        } else null

        val response = memoApi.getTimeline(
            limit = 20,
            username = username,
            cursorId = cursor?.id,
            cursorCreatedAt = cursor?.createdAt
        )

        return when (val result = response.toApiResult()) {
            is ApiResult.Success -> {
                val newList = result.data.data
                updateEntities(newList)
                if (username == null) {
                    _exploreTimeline.update { currentList ->
                        val oldIds = if (cursor == null) emptyList() else currentList
                        (oldIds + newList.map { it.id }).distinct()
                    }
                    exploreTimelineCursor = result.data.nextCursor
                } else {
                    _personalTimeline.update { currentMap ->
                        val oldIds =
                            if (cursor == null) emptyList() else currentMap[username] ?: emptyList()
                        currentMap + (username to (oldIds + newList.map { it.id }).distinct())
                    }
                    personalTimelineCursor[username] = result.data.nextCursor
                }
                result.data
            }

            is ApiResult.Failure -> throw BusinessException(
                result.code,
                result.errorMessage,
                result.traceId
            )
        }
    }

    suspend fun publish(
        content: String,
        visibility: String = "public",
        resources: List<String> = emptyList(),
        referredMemoId: String? = null,
        replyMemo: Memo?
    ): Memo {
        val response = memoApi.publish(
            PublishRequest(
                content = content,
                visibility = visibility,
                resources = resources,
                quoteId = referredMemoId,
                parentId = replyMemo?.id
            )
        )
        return when (val result = response.toApiResult()) {
            is ApiResult.Failure -> throw BusinessException(
                result.code,
                result.errorMessage,
                result.traceId
            )

            is ApiResult.Success -> {
                val newMemo = result.data
                updateEntities(listOf(newMemo))
                _exploreTimeline.update { listOf(newMemo.id) + it }
                newMemo.author?.username?.let { name ->
                    _personalTimeline.update {
                        it + (name to (listOf(newMemo.id) + (it[name] ?: emptyList())))
                    }
                }
                newMemo
            }
        }
    }

    suspend fun deleteMemo(id: String): Boolean {
        val response = memoApi.deleteMemo(id)
        return when (val result = response.toApiResult()) {
            is ApiResult.Failure -> throw BusinessException(
                result.code,
                result.errorMessage,
                result.traceId
            )

            is ApiResult.Success -> {
                _memoEntities.update { it - id }
                _personalTimeline.update { map -> map.mapValues { (_, ids) -> ids.filter { it != id } } }
                _exploreTimeline.update { list -> list.filter { it != id } }
                true
            }
        }
    }

    suspend fun patchMemo(
        id: String,
        content: String?,
        visibility: String?,
        resources: List<Resource>?,
        createdAt: String?,
        isPinned: Boolean?,
        quoteMemo: PatchQuoteMemoField
    ): Boolean {
        val oldMemo = _memoEntities.value[id]
        val finalQuotedMemo = when (quoteMemo) {
            is PatchQuoteMemoField.Exist -> quoteMemo.memo
            is PatchQuoteMemoField.Empty -> null
            else -> oldMemo?.quotedMemo
        }

        // 乐观更新
        _memoEntities.update { currentMap ->
            val memo = currentMap[id] ?: return@update currentMap
            currentMap + (id to memo.copy(
                content = content ?: memo.content,
                visibility = visibility ?: memo.visibility,
                resources = resources ?: memo.resources,
                createdAt = createdAt ?: memo.createdAt,
                isPinned = isPinned ?: memo.isPinned,
                quotedMemo = finalQuotedMemo
            ))
        }

        val createdAtTimestamp = createdAt?.let { Instant.parse(it).toEpochMilliseconds() }
        val patchBody = buildJsonObject {
            put("quoteId", finalQuotedMemo?.id)
            isPinned?.let { put("isPinned", it) }
            createdAtTimestamp?.let { put("createdAt", it) }
            visibility?.let { put("visibility", it) }
            resources?.let { list -> putJsonArray("resources") { list.forEach { add(it.id) } } }
            content?.let { put("content", it) }
        }

        val response = memoApi.patchMemo(id, patchBody)
        return when (val result = response.toApiResult()) {
            is ApiResult.Failure -> {
                if (oldMemo != null) _memoEntities.update { it + (id to oldMemo) }
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> true
        }
    }

    fun getMemoDetail(id: String): Flow<Memo> = flow {
        _memoEntities.value[id]?.let { emit(it) }
        val response = memoApi.getMemoDetail(id)
        when (val result = response.toApiResult()) {
            is ApiResult.Failure -> throw BusinessException(
                result.code,
                result.errorMessage,
                result.traceId
            )

            is ApiResult.Success -> {
                emit(result.data)
                updateEntities(listOf(result.data))
            }
        }
    }

    fun searchMemos(keyword: String): Flow<List<Memo>> = flow {
        val response = memoApi.searchMemos(keyword)
        when (val result = response.toApiResult()) {
            is ApiResult.Failure -> throw BusinessException(
                result.code,
                result.errorMessage,
                result.traceId
            )

            is ApiResult.Success -> emit(result.data)
        }
    }
}