package com.roitium.nodal.data.api

import com.roitium.nodal.data.models.RecordUploadRequest
import com.roitium.nodal.data.models.Resource
import com.roitium.nodal.data.models.Response
import com.roitium.nodal.data.models.UploadUrlResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Query
import retrofit2.http.Url

interface NodalResourceApi {
    @GET("/api/v1/resources/upload-url")
    suspend fun getUploadUrl(
        @Query("fileType") fileType: String,
        @Query("ext") ext: String
    ): Response<UploadUrlResponse>

    @POST("/api/v1/resources/record-upload")
    suspend fun recordUpload(@Body request: RecordUploadRequest): Response<Resource>

    @PUT
    suspend fun uploadFileContent(
        @Url url: String,
        @Body body: okhttp3.RequestBody
    ): retrofit2.Response<Unit>

    @GET("/api/v1/resources/user-all")
    suspend fun getUserAllResources(): Response<List<Resource>>

}