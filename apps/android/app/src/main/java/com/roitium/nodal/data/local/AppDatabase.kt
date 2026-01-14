package com.roitium.nodal.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.roitium.nodal.data.local.dao.MemoDao
import com.roitium.nodal.data.local.dao.RemoteCursorDao
import com.roitium.nodal.data.local.entity.MemoEntity
import com.roitium.nodal.data.local.entity.RemoteCursorEntity

@Database(
    entities = [MemoEntity::class, RemoteCursorEntity::class],
    version = 2,
    exportSchema = true,
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun memoDao(): MemoDao
    abstract fun remoteCursorDao(): RemoteCursorDao
}

val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            "ALTER TABLE MemoEntity ADD COLUMN subReplyCount INTEGER NOT NULL DEFAULT 0"
        )
    }
}