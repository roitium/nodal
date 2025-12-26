package com.roitium.nodal.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Query
import retrofit2.http.Url

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

    @GET("/api/v1/resources/upload-url")
    suspend fun getUploadUrl(
        @Query("fileType") fileType: String,
        @Query("ext") ext: String
    ): UploadUrlResponse

    @POST("/api/v1/resources/record-upload")
    suspend fun recordUpload(@Body request: RecordUploadRequest): Resource

    @PUT
    suspend fun uploadFileContent(
        @Url url: String,
        @Body body: okhttp3.RequestBody
    ): retrofit2.Response<Unit>
}
