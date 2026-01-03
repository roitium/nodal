package com.roitium.nodal.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.roitium.nodal.data.local.dao.MemoDao
import com.roitium.nodal.data.local.entity.MemoEntity

@Database(entities = [MemoEntity::class], version = 1, exportSchema = false)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun memoDao(): MemoDao

    companion object {
        // Volatile 保证多线程可见性
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "memos_database"
                )
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}