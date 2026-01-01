package com.roitium.nodal.data.api

import com.roitium.nodal.data.models.AuthResponse
import com.roitium.nodal.data.models.LoginRequest
import com.roitium.nodal.data.models.RegisterRequest
import com.roitium.nodal.data.models.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface NodalAuthApi {
    @POST("/api/v1/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("/api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>
}