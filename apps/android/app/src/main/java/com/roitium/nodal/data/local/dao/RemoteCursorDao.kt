package com.roitium.nodal.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.roitium.nodal.data.local.entity.RemoteCursorEntity

@Dao
abstract class RemoteCursorDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun insertOrReplace(remoteKey: RemoteCursorEntity)

    @Query("SELECT * FROM remote_cursors WHERE id = :id")
    abstract suspend fun getRemoteCursor(id: String): RemoteCursorEntity?

    @Query("DELETE FROM remote_cursors WHERE id = :id")
    abstract suspend fun deleteRemoteCursor(id: String)
}