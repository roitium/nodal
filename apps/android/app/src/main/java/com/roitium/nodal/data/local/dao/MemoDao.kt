package com.roitium.nodal.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.roitium.nodal.data.local.entity.MemoEntity
import com.roitium.nodal.data.local.entity.SyncStatus
import com.roitium.nodal.data.local.relation.MemoPopulated
import com.roitium.nodal.data.models.PatchQuoteMemoField
import com.roitium.nodal.data.models.Resource
import kotlinx.coroutines.flow.Flow

@Dao
abstract class MemoDao {
    /**
     * 获取 Explore 时间线
     * 规则：排除被删除的 + 排除回复 + 按置顶和时间排序
     */
    @Transaction
    @Query(
        """
        SELECT * FROM memos 
        WHERE status != 'PENDING_DELETE' 
        AND parentId IS NULL 
        ORDER BY isPinned DESC, createdAt DESC
    """
    )
    abstract fun getExploreTimeline(): Flow<List<MemoPopulated>>

    /**
     * 获取个人主页时间线
     */
    @Transaction
    @Query(
        """
        SELECT * FROM memos 
        WHERE status != 'PENDING_DELETE' 
        AND parentId IS NULL 
        AND authorUsername = :username
        ORDER BY isPinned DESC, createdAt DESC
    """
    )
    abstract fun getPersonalTimeline(username: String): Flow<List<MemoPopulated>>

    /**
     * 获取单条 Memo 详情
     */
    @Transaction
    @Query("SELECT * FROM memos WHERE id = :id")
    abstract fun getMemoById(id: String): Flow<MemoPopulated?>

    /**
     * 获取某条 Memo 的所有评论
     */
    @Transaction
    @Query(
        """
        SELECT * FROM memos 
        WHERE status != 'PENDING_DELETE' 
        AND parentId = :memoId
        ORDER BY createdAt ASC
    """
    )
    abstract fun getReplies(memoId: String): Flow<List<MemoPopulated>>


    // 获取所有需要同步到服务器的数据
    @Query("SELECT * FROM memos WHERE status != 'SYNCED'")
    abstract suspend fun getUnsyncedMemos(): List<MemoEntity>

    // 仅仅更新状态
    @Query("UPDATE memos SET status = :status WHERE id = :id")
    abstract suspend fun updateStatus(id: String, status: SyncStatus)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract suspend fun insertMemo(memo: MemoEntity)

    /**
     * FIXME: 如果本地有 PENDING_UPDATE，而 API 返回了旧数据，REPLACE 会覆盖掉本地修改。
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract suspend fun insertMemos(memos: List<MemoEntity>)

    @Query(
        """
    UPDATE memos SET 
        content = COALESCE(:content, content),
        updatedAt = COALESCE(:updatedAt, updatedAt),
        status = COALESCE(:status, status),
        quotedMemo = COALESCE(:quoteMemo, quotedMemo),
        isPinned = COALESCE(:isPinned, isPinned),
        resources = COALESCE(:resources, resources), 
        createdAt = COALESCE(:createdAt, createdAt)
    WHERE id = :id
"""
    )
    protected abstract suspend fun updateRaw(
        id: String,
        content: String?,
        updatedAt: Long?,
        status: SyncStatus?,
        quoteMemo: MemoEntity?,
        isPinned: Boolean?,
        resources: List<Resource>?,
        createdAt: String?
    ): Int

    @Query("DELETE FROM memos WHERE id = :id")
    abstract suspend fun deleteRaw(id: String)

    @Query("SELECT status FROM memos WHERE id = :id")
    protected abstract suspend fun getStatus(id: String): SyncStatus?

    @Transaction
    open suspend fun smartCreate(memo: MemoEntity) {
        insertMemo(memo.copy(status = SyncStatus.PENDING_CREATE))
    }

    @Transaction
    open suspend fun smartUpdate(
        id: String, content: String?,
        visibility: String?,
        resources: List<Resource>?,
        createdAt: String?,
        isPinned: Boolean?,
        quoteMemo: PatchQuoteMemoField
    ): Int {
        val currentStatus = getStatus(id) ?: return 0
        val now = System.currentTimeMillis()
        val finalQuotedMemo = when (quoteMemo) {
            is PatchQuoteMemoField.Exist -> quoteMemo.memo
            is PatchQuoteMemoField.Empty -> null
        }

        val nextStatus = when (currentStatus) {
            SyncStatus.PENDING_CREATE -> SyncStatus.PENDING_CREATE // 还没传上去，本地改了还是算新建
            else -> SyncStatus.PENDING_UPDATE // 已同步的或已修改的，再次修改都算待更新
        }

        return updateRaw(
            id,
            content,
            now,
            nextStatus,
            finalQuotedMemo,
            isPinned,
            resources,
            createdAt
        )
    }

    @Transaction
    open suspend fun smartDelete(id: String) {
        val currentStatus = getStatus(id) ?: return

        when (currentStatus) {
            SyncStatus.PENDING_CREATE -> deleteRaw(id) // 还没传上去，直接删除
            else -> updateStatus(id, SyncStatus.PENDING_DELETE)
        }
    }

    /**
     * 通过 /timeline api 获取到的数据应该通过这个方法安全地保存
     */
    @Transaction
    open suspend fun saveSyncMemos(remoteMemos: List<MemoEntity>) {
        val unsyncedIds = getUnsyncedMemos().map { it.id }.toSet()

        val memosToInsert = remoteMemos.filter {
            !unsyncedIds.contains(it.id)
        }

        if (memosToInsert.isNotEmpty()) {
            insertMemos(memosToInsert)
        }
    }

    /**
     * 清空 Explore 时间线：只删已同步的、且是主贴的数据。(相关评论也会级联删除)
     */
    @Query("DELETE FROM memos WHERE status = 'SYNCED' AND parentId IS NULL")
    abstract suspend fun clearExploreTimelineCache()

    /**
     * 清空个人主页时间线：只删已同步的、且是主贴的数据。(相关评论也会级联删除)
     */
    @Query("DELETE FROM memos WHERE status = 'SYNCED' AND parentId IS NULL AND authorUsername = :username")
    abstract suspend fun clearPersonalTimelineCache(username: String)
}