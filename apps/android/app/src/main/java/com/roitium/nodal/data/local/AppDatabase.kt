package com.roitium.nodal.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.roitium.nodal.data.local.dao.MemoDao
import com.roitium.nodal.data.local.dao.RemoteCursorDao
import com.roitium.nodal.data.local.entity.MemoEntity
import com.roitium.nodal.data.local.entity.RemoteCursorEntity

@Database(
    entities = [MemoEntity::class, RemoteCursorEntity::class],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun memoDao(): MemoDao
    abstract fun remoteCursorDao(): RemoteCursorDao
}