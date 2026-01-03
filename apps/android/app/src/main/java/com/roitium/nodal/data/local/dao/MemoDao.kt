package com.roitium.nodal.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.roitium.nodal.data.local.entity.MemoEntity
import com.roitium.nodal.data.local.entity.SyncStatus
import kotlinx.coroutines.flow.Flow

@Dao
abstract class MemoDao {
    @Query(
        """
        SELECT * FROM memos 
        WHERE status != 'PENDING_DELETE' 
        ORDER BY isPinned DESC, createdTs DESC
    """
    )
    abstract fun getVisibleMemos(): Flow<List<MemoEntity>>

    @Query("SELECT * FROM memos WHERE status != 'SYNCED'")
    abstract suspend fun getUnsyncedMemos(): List<MemoEntity>

    @Query("SELECT status FROM memos WHERE id = :id")
    abstract suspend fun getStatus(id: String): SyncStatus?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    protected abstract suspend fun insertRaw(memo: MemoEntity)

    @Query("UPDATE memos SET content = :content, updatedTs = :ts, status = :status WHERE id = :id")
    protected abstract suspend fun updateRaw(
        id: String,
        content: String,
        ts: Long,
        status: SyncStatus
    )

    @Query("UPDATE memos SET status = :status WHERE id = :id")
    abstract suspend fun updateStatus(
        id: String,
        status: SyncStatus
    )

    @Query("DELETE FROM memos WHERE id = :id")
    abstract suspend fun deleteRaw(id: String)

    @Transaction
    open suspend fun smartCreate(memo: MemoEntity) {
        insertRaw(memo.copy(status = SyncStatus.PENDING_CREATE))
    }

    @Transaction
    open suspend fun smartUpdate(id: String, newContent: String) {
        val currentStatus = getStatus(id) ?: return
        val now = System.currentTimeMillis()

        val nextStatus = when (currentStatus) {
            SyncStatus.PENDING_CREATE -> SyncStatus.PENDING_CREATE // 还没创建时，修改 == 新建
            else -> SyncStatus.PENDING_UPDATE // 其他情况都算更新
        }

        updateRaw(id, newContent, now, nextStatus)
    }

    @Transaction
    open suspend fun smartDelete(id: String) {
        val currentStatus = getStatus(id) ?: return

        when (currentStatus) {
            SyncStatus.PENDING_CREATE -> deleteRaw(id) // 还没创建时，直接在本地删了就行
            else -> updateStatus(id, SyncStatus.PENDING_DELETE) // 其他情况就标记待删除
        }
    }
}