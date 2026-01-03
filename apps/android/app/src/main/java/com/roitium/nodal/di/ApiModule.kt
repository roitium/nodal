package com.roitium.nodal.di

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.roitium.nodal.data.api.NodalAuthApi
import com.roitium.nodal.data.api.NodalMemoApi
import com.roitium.nodal.data.api.NodalResourceApi
import com.roitium.nodal.utils.AuthTokenManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import jakarta.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

@Module
@InstallIn(SingletonComponent::class)
object ApiModule {
    private const val BASE_URL = "https://nodal.roitium.com"

    @Provides
    @Singleton
    fun provideAuthInterceptor(tokenManager: AuthTokenManager): Interceptor {
        return Interceptor { chain ->
            val original = chain.request()
            val token = tokenManager.cachedToken

            if (token != null) {
                val sanitizedToken = token.replace("\n", "").replace("\r", "").trim()
                chain.proceed(
                    original.newBuilder()
                        .header("Authorization", "Bearer $sanitizedToken")
                        .build()
                )
            } else {
                chain.proceed(original)
            }
        }
    }

    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(authInterceptor: Interceptor): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, json: Json): Retrofit {
        return Retrofit.Builder().baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }

    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): NodalAuthApi {
        return retrofit.create(NodalAuthApi::class.java)
    }

    @Provides
    @Singleton
    fun provideMemoApi(retrofit: Retrofit): NodalMemoApi {
        return retrofit.create(NodalMemoApi::class.java)
    }

    @Provides
    @Singleton
    fun provideResourceApi(retrofit: Retrofit): NodalResourceApi {
        return retrofit.create(NodalResourceApi::class.java)
    }
}