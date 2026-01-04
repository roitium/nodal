package com.roitium.nodal.data.repository

import androidx.room.withTransaction
import com.roitium.nodal.data.api.NodalMemoApi
import com.roitium.nodal.data.local.AppDatabase
import com.roitium.nodal.data.local.dao.MemoDao
import com.roitium.nodal.data.local.dao.RemoteCursorDao
import com.roitium.nodal.data.local.entity.MemoEntity
import com.roitium.nodal.data.local.entity.RemoteCursorEntity
import com.roitium.nodal.data.local.entity.SyncStatus
import com.roitium.nodal.data.local.entity.toFlattenEntityList
import com.roitium.nodal.data.local.relation.MemoPopulated
import com.roitium.nodal.data.models.ApiMemo
import com.roitium.nodal.data.models.ApiResult
import com.roitium.nodal.data.models.PatchQuoteMemoField
import com.roitium.nodal.data.models.PublishRequest
import com.roitium.nodal.data.models.Resource
import com.roitium.nodal.data.models.TimelineResponse
import com.roitium.nodal.exceptions.BusinessException
import com.roitium.nodal.exceptions.NotLoginException
import com.roitium.nodal.utils.AuthState
import com.roitium.nodal.utils.AuthTokenManager
import jakarta.inject.Inject
import jakarta.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlin.time.Clock
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid

@Singleton
class MemoRepository @Inject constructor(
    private val memoDao: MemoDao,
    private val memoApi: NodalMemoApi,
    private val authTokenManager: AuthTokenManager,
    private val remoteCursorDao: RemoteCursorDao,
    private val appDatabase: AppDatabase
) {
    fun getTimelineFlow(username: String?): Flow<List<MemoPopulated>> {
        return if (username == null) memoDao.getExploreTimeline() else memoDao.getPersonalTimeline(
            username
        )
    }

    fun getMemoDetailFlow(id: String): Flow<MemoPopulated?> = memoDao.getMemoById(id)

    /**
     * username 和 userId 必须要同时提供
     */
    suspend fun fetchTimeline(username: String? = null, isRefresh: Boolean): TimelineResponse {
        val remoteKeyId = if (username == null) "explore" else "personal-$username"

        val (cursorId, cursorTime) = if (isRefresh) {
            null to null
        } else {
            val remoteKey = remoteCursorDao.getRemoteCursor(remoteKeyId)
            remoteKey?.nextCursorId to remoteKey?.nextCursorTime
        }

        val response = memoApi.getTimeline(
            limit = 20,
            username = username,
            cursorId = cursorId,
            cursorCreatedAt = cursorTime
        )
        return when (val result = response.toApiResult()) {
            is ApiResult.Success -> {
                val data = result.data
                appDatabase.withTransaction {
                    if (isRefresh) {
                        if (username == null) memoDao.clearExploreTimelineCache()
                        else memoDao.clearPersonalTimelineCache(username)

                        remoteCursorDao.deleteRemoteCursor(remoteKeyId)
                    }
                    memoDao.saveSyncMemos(data.data.flatMap { it.toFlattenEntityList() })

                    if (data.nextCursor != null) {
                        remoteCursorDao.insertOrReplace(
                            RemoteCursorEntity(
                                id = remoteKeyId,
                                nextCursorId = data.nextCursor.id,
                                nextCursorTime = data.nextCursor.createdAt
                            )
                        )
                    }
                }
                data
            }

            is ApiResult.Failure -> throw BusinessException(
                result.code,
                result.errorMessage,
                result.traceId
            )
        }
    }

    @OptIn(ExperimentalUuidApi::class)
    suspend fun publish(
        content: String,
        visibility: String = "public",
        resources: List<Resource> = emptyList(),
        referredMemo: MemoEntity? = null,
        replyMemo: MemoEntity?,
        isPinned: Boolean = false
    ): ApiMemo {
        val memoId = Uuid.generateV7().toString()
        val now = Clock.System.now().toString()
        val auth = authTokenManager.authStateFlow.first()

        if (auth !is AuthState.Authenticated) {
            throw NotLoginException("请先登录")
        }

        val tempEntity = MemoEntity(
            id = memoId,
            content = content,
            authorUsername = auth.user.username,
            author = auth.user,
            parentId = replyMemo?.id,
            quotedMemo = referredMemo,
            visibility = visibility,
            createdAt = now,
            resources = resources,
            status = SyncStatus.PENDING_CREATE,
            updatedAt = now,
            isPinned = isPinned
        )

        memoDao.smartCreate(tempEntity)

        val response = memoApi.publish(
            PublishRequest(
                content = content,
                visibility = visibility,
                resources = resources.map { it.id },
                quoteId = referredMemo?.id,
                parentId = replyMemo?.id,
                isPinned = isPinned,
                id = memoId
            )
        )

        return when (val result = response.toApiResult()) {
            is ApiResult.Success -> {
                val realMemo = result.data

                // 服务器会直接使用我们传入的 uuid
                memoDao.updateStatus(memoId, SyncStatus.SYNCED)

                realMemo
            }

            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }
        }
    }

    suspend fun refreshMemoDetail(id: String) {
        try {
            val response = memoApi.getMemoDetail(id)
            when (val result = response.toApiResult()) {
                is ApiResult.Success -> {
                    memoDao.saveSyncMemos(result.data.toFlattenEntityList())
                }

                is ApiResult.Failure -> {
                    throw BusinessException(result.code, result.errorMessage, result.traceId)
                }
            }
        } catch (e: Exception) {
            // 静默失败
        }
    }

    suspend fun deleteMemo(id: String): Boolean {
        memoDao.smartDelete(id)

        val response = memoApi.deleteMemo(id)

        return when (val result = response.toApiResult()) {
            is ApiResult.Success -> {
                memoDao.deleteRaw(id)
                true
            }

            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
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
        val finalQuotedMemo = when (quoteMemo) {
            is PatchQuoteMemoField.Exist -> quoteMemo.memo
            is PatchQuoteMemoField.Empty -> null
        }

        val rowsAffected = memoDao.smartUpdate(
            id = id,
            content = content,
            visibility = visibility,
            resources = resources,
            createdAt = createdAt,
            isPinned = isPinned,
            quoteMemo = quoteMemo
        )
        if (rowsAffected == 0) {
            throw BusinessException(404, "找不到 memo", "")
        }
        val patchBody = buildJsonObject {
            put("quoteId", finalQuotedMemo?.id)
            isPinned?.let { put("isPinned", it) }
            createdAt?.let { put("createdAt", it) }
            visibility?.let { put("visibility", it) }
            resources?.let { list -> putJsonArray("resources") { list.forEach { add(it.id) } } }
            content?.let { put("content", it) }
        }

        val response = memoApi.patchMemo(id, patchBody)
        return when (val result = response.toApiResult()) {
            is ApiResult.Success -> {
                memoDao.updateStatus(id, SyncStatus.SYNCED)
                true
            }

            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }
        }
    }

    fun searchMemos(keyword: String): Flow<List<ApiMemo>> = flow {
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

    suspend fun hasSynced(username: String?): Boolean {
        val keyId = if (username == null) "explore" else "user_$username"
        return remoteCursorDao.getRemoteCursor(keyId) != null
    }
}