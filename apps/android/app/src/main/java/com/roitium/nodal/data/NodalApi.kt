package com.roitium.nodal.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface NodalApi {
    @POST("/api/v1/auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @POST("/api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @GET("/api/v1/memos/timeline")
    suspend fun getTimeline(
        @Query("limit") limit: Int? = 5,
        @Query("cursorCreatedAt") cursorCreatedAt: Long? = null,
        @Query("cursorId") cursorId: String? = null,
        @Query("username") username: String? = null
    ): TimelineResponse

    @POST("/api/v1/memos/publish")
    suspend fun publish(@Body request: PublishRequest): Memo
}
