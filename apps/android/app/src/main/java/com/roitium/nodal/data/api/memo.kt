package com.roitium.nodal.data.api

import com.roitium.nodal.data.Memo
import com.roitium.nodal.data.PatchMemoRequest
import com.roitium.nodal.data.PublishRequest
import com.roitium.nodal.data.Response
import com.roitium.nodal.data.TimelineResponse
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface NodalMemoApi {
    @GET("/api/v1/memos/timeline")
    suspend fun getTimeline(
        @Query("limit") limit: Int? = 5,
        @Query("cursorCreatedAt") cursorCreatedAt: Long? = null,
        @Query("cursorId") cursorId: String? = null,
        @Query("username") username: String? = null
    ): Response<TimelineResponse>

    @POST("/api/v1/memos/publish")
    suspend fun publish(@Body request: PublishRequest): Response<Memo>

    @DELETE("/api/v1/memos/{memoId}")
    suspend fun deleteMemo(@Path("memoId") memoId: String): Response<Boolean>

    @PATCH("/api/v1/memos/{memoId}")
    suspend fun patchMemo(
        @Path("memoId") memoId: String,
        @Body request: PatchMemoRequest
    ): Response<Boolean>
}