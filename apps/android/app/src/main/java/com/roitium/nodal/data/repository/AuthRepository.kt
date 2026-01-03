package com.roitium.nodal.data.repository

import com.roitium.nodal.data.api.NodalAuthApi
import com.roitium.nodal.data.models.ApiResult
import com.roitium.nodal.data.models.AuthResponse
import com.roitium.nodal.data.models.LoginRequest
import com.roitium.nodal.data.models.RegisterRequest
import com.roitium.nodal.exceptions.BusinessException
import com.roitium.nodal.utils.AuthTokenManager
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: NodalAuthApi,
    private val authTokenManager: AuthTokenManager
) {
    suspend fun login(req: LoginRequest): AuthResponse {
        val response = authApi.login(req)
        return when (val result = response.toApiResult()) {
            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> {
                authTokenManager.saveAuthInfo(token = result.data.token, user = result.data.user)
                result.data
            }
        }
    }

    suspend fun register(req: RegisterRequest): AuthResponse {
        val response = authApi.register(req)
        return when (val result = response.toApiResult()) {
            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> {
                authTokenManager.saveAuthInfo(token = result.data.token, user = result.data.user)
                result.data
            }
        }
    }

    suspend fun logout() {
        authTokenManager.clearAuthInfo()
    }
}