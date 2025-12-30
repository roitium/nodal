package com.roitium.nodal.data

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.roitium.nodal.data.api.NodalAuthApi
import com.roitium.nodal.data.api.NodalMemoApi
import com.roitium.nodal.data.api.NodalResourceApi
import com.roitium.nodal.exceptions.BusinessException
import com.roitium.nodal.utils.AuthTokenManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

sealed class AuthState {
    object Initializing : AuthState()
    data class Authenticated(val user: User, val token: String) : AuthState()
    object Unauthenticated : AuthState()
}

object NodalRepository {
    private const val BASE_URL = "https://nodal.roitium.com"

    @Volatile
    private var cachedAuthToken: String? = null
    private var authTokenManager: AuthTokenManager? = null

    private val _authState = MutableStateFlow<AuthState>(AuthState.Initializing)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    fun initialize(context: Context, scope: CoroutineScope) {
        if (authTokenManager != null) return

        val manager = AuthTokenManager(context.applicationContext)
        authTokenManager = manager

        scope.launch(Dispatchers.IO) {
            manager.authStateFlow.collect { state ->
                cachedAuthToken = if (state is AuthState.Authenticated) state.token else null

                _authState.value = state
            }
        }
    }


    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
    }

    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val token = cachedAuthToken
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

    private val client = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val retrofitClient = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    val memoApi: NodalMemoApi = retrofitClient.create(NodalMemoApi::class.java)
    val resourceApi: NodalResourceApi = retrofitClient.create(NodalResourceApi::class.java)
    val authApi: NodalAuthApi = retrofitClient.create(NodalAuthApi::class.java)

    suspend fun logout() {
        authTokenManager?.clearAuthInfo()
    }

    suspend fun login(req: LoginRequest): AuthResponse {
        val response = authApi.login(req)
        when (val result = response.toApiResult()) {
            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> {
                authTokenManager?.saveAuthInfo(token = result.data.token, user = result.data.user)
                return result.data
            }
        }
    }

    suspend fun register(req: RegisterRequest): AuthResponse {
        val response = authApi.register(req)
        when (val result = response.toApiResult()) {
            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> {
                authTokenManager?.saveAuthInfo(token = result.data.token, user = result.data.user)
                return result.data
            }
        }
    }

    suspend fun getTimeline(
        limit: Int? = 20,
        cursorCreatedAt: Long? = null,
        cursorId: String? = null,
        username: String? = null
    ): TimelineResponse {
        val response = memoApi.getTimeline(limit, cursorCreatedAt, cursorId, username)
        when (val result = response.toApiResult()) {
            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> {
                return result.data
            }
        }
    }

    suspend fun publish(
        content: String,
        visibility: String = "public",
        resources: List<String> = emptyList()
    ): Memo {
        val response = memoApi.publish(
            PublishRequest(
                content = content,
                visibility = visibility,
                resources = resources
            )
        )
        when (val result = response.toApiResult()) {
            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> {
                return result.data
            }
        }
    }

    suspend fun uploadFile(context: Context, uri: Uri): Resource {
        val contentResolver = context.contentResolver
        val type = contentResolver.getType(uri) ?: "application/octet-stream"
        val ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(type) ?: "bin"

        val uploadUrlResponse = resourceApi.getUploadUrl(type, ext)
        val uploadInfo = when (val result = uploadUrlResponse.toApiResult()) {
            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> result.data
        }

        val inputStream = contentResolver.openInputStream(uri) ?: throw Exception("Cannot open URI")
        val bytes = inputStream.readBytes()
        inputStream.close()

        val requestBody = bytes.toRequestBody(type.toMediaType())
        val uploadResponse = resourceApi.uploadFileContent(uploadInfo.uploadUrl, requestBody)

        if (!uploadResponse.isSuccessful) {
            throw Exception("Upload failed: ${uploadResponse.code()}")
        }

        val filename = try {
            var name = "unknown"
            val cursor = contentResolver.query(uri, null, null, null, null)
            cursor?.use {
                if (it.moveToFirst()) {
                    val nameIndex = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (nameIndex >= 0) name = it.getString(nameIndex)
                }
            }
            name
        } catch (e: Exception) {
            "unknown.$ext"
        }

        val recordResponse = resourceApi.recordUpload(
            RecordUploadRequest(
                path = uploadInfo.path,
                fileType = type,
                fileSize = bytes.size.toLong(),
                filename = filename
            )
        )

        when (val result = recordResponse.toApiResult()) {
            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> {
                return result.data
            }
        }
    }

    suspend fun deleteMemo(id: String): Boolean {
        val response = memoApi.deleteMemo(id)
        when (val result = response.toApiResult()) {
            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> {
                return true
            }
        }
    }

    suspend fun patchMemo(
        id: String,
        content: String?,
        visibility: String?,
        resources: List<String>?,
        createdAt: Long?,
        isPinned: Boolean?,
        quoteId: String?
    ): Boolean {
        val response = memoApi.patchMemo(
            id,
            PatchMemoRequest(content, visibility, quoteId, resources, createdAt, isPinned)
        )
        when (val result = response.toApiResult()) {
            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> {
                return true
            }
        }
    }
}
