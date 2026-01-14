package com.roitium.nodal.di

import android.content.Context
import androidx.room.Room
import com.roitium.nodal.data.local.AppDatabase
import com.roitium.nodal.data.local.MIGRATION_1_2
import com.roitium.nodal.data.local.dao.MemoDao
import com.roitium.nodal.data.local.dao.RemoteCursorDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import jakarta.inject.Qualifier
import jakarta.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "memos_db"
        ).addMigrations(MIGRATION_1_2).build()
    }

    @Provides
    fun provideMemoDao(database: AppDatabase): MemoDao {
        return database.memoDao()
    }

    @Provides
    fun provideRemoteCursorDao(database: AppDatabase): RemoteCursorDao {
        return database.remoteCursorDao()
    }

    @Retention(AnnotationRetention.RUNTIME)
    @Qualifier
    annotation class ApplicationScope

    @Provides
    @Singleton
    @ApplicationScope
    fun provideApplicationScope(): CoroutineScope {
        return CoroutineScope(SupervisorJob() + Dispatchers.Default)
    }
}