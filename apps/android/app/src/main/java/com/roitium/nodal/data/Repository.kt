package com.roitium.nodal.data

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Log
import android.webkit.MimeTypeMap
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.roitium.nodal.data.api.NodalAuthApi
import com.roitium.nodal.data.api.NodalMemoApi
import com.roitium.nodal.data.api.NodalResourceApi
import com.roitium.nodal.data.models.ApiResult
import com.roitium.nodal.data.models.AuthResponse
import com.roitium.nodal.data.models.Cursor
import com.roitium.nodal.data.models.LoginRequest
import com.roitium.nodal.data.models.Memo
import com.roitium.nodal.data.models.PatchQuoteMemoField
import com.roitium.nodal.data.models.PublishRequest
import com.roitium.nodal.data.models.RecordUploadRequest
import com.roitium.nodal.data.models.RegisterRequest
import com.roitium.nodal.data.models.Resource
import com.roitium.nodal.data.models.TimelineResponse
import com.roitium.nodal.data.models.User
import com.roitium.nodal.exceptions.BusinessException
import com.roitium.nodal.utils.AuthTokenManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit
import kotlin.time.Instant

sealed class AuthState {
    object Initializing : AuthState()
    data class Authenticated(val user: User, val token: String) : AuthState()
    object Unauthenticated : AuthState()
}

object NodalRepository {
    private const val BASE_URL = "http://10.0.2.2:3000"

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

    private val memoApi: NodalMemoApi = retrofitClient.create(NodalMemoApi::class.java)
    private val resourceApi: NodalResourceApi = retrofitClient.create(NodalResourceApi::class.java)
    private val authApi: NodalAuthApi = retrofitClient.create(NodalAuthApi::class.java)

    private val _memoEntities = MutableStateFlow<Map<String, Memo>>(emptyMap())

    // 储存每个用户名对应时间线的索引
    private val _personalTimeline = MutableStateFlow<Map<String, List<String>>>(emptyMap())

    // 储存 explore 页面的时间线索引
    private val _exploreTimeline = MutableStateFlow<List<String>>(emptyList())

    // 我觉得 cursor 应该是属于 ViewModel 层的，但是放在 ViewModel 层的话，每次切换 cursor 都会丢失，数据也要重新 refresh，用户体验不好。
    var exploreTimelineCursor: Cursor? = null
    var personalTimelineCursor: MutableMap<String, Cursor?> = mutableMapOf()

    private fun updateEntities(memos: List<Memo>) {
        _memoEntities.update { current ->
            current + memos.associateBy { it.id }
        }
    }

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

    fun getTimelineFlow(username: String?): Flow<List<Memo>> {
        if (username == null) {
            return _exploreTimeline.combine(_memoEntities) { ids, entities ->
                ids.mapNotNull { entities[it] }
            }
        }
        return _personalTimeline.map { it[username] ?: emptyList() }
            .combine(_memoEntities) { ids, entities ->
                ids.mapNotNull { entities[it] }
            }
    }

    suspend fun fetchTimeline(
        username: String? = null,
        isRefresh: Boolean // 是否是刷新。如果是刷新的话，会获取最新的数据，然后删除过去所有的（目前实现有点过于简单了）
    ): TimelineResponse {
        var cursor: Cursor? = null
        if (!isRefresh) {
            cursor = if (username == null) {
                exploreTimelineCursor
            } else {
                personalTimelineCursor[username]
            }
        }
        val response = memoApi.getTimeline(
            limit = 20,
            username = username,
            cursorId = cursor?.id,
            cursorCreatedAt = cursor?.createdAt
        )
        when (val result = response.toApiResult()) {
            is ApiResult.Success -> {
                val newList = result.data.data
                updateEntities(newList)
                if (username == null) {
                    _exploreTimeline.update { currentList ->
                        val oldIds = if (cursor == null) emptyList() else currentList
                        (oldIds + newList.map { it.id }).distinct()
                    }
                } else {
                    _personalTimeline.update { currentMap ->
                        val oldIds = if (cursor == null) emptyList() else currentMap[username]
                            ?: emptyList()
                        val combinedIds = (oldIds + newList.map { it.id }).distinct()
                        currentMap + (username to combinedIds)
                    }
                }
                if (username == null) {
                    exploreTimelineCursor = result.data.nextCursor
                } else {
                    personalTimelineCursor[username] = result.data.nextCursor
                }
                return result.data
            }

            is ApiResult.Failure -> throw BusinessException(
                result.code,
                result.errorMessage,
                result.traceId
            )
        }
    }

    suspend fun publish(
        content: String,
        visibility: String = "public",
        resources: List<String> = emptyList(),
        referredMemoId: String? = null
    ): Memo {
        val response = memoApi.publish(
            PublishRequest(
                content = content,
                visibility = visibility,
                resources = resources,
                quoteId = referredMemoId
            )
        )
        when (val result = response.toApiResult()) {
            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> {
                // 乐观更新，同时把新创建的 memo 插入到最顶端
                updateEntities(listOf(result.data))
                _exploreTimeline.update { currentList ->
                    listOf(result.data.id) + currentList
                }
                if (result.data.author?.username != null) {
                    _personalTimeline.update { currentMap ->
                        val newList =
                            listOf(result.data.id) + (currentMap[result.data.author.username]
                                ?: emptyList())
                        currentMap + (result.data.author.username to newList)
                    }
                }
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
                _memoEntities.update { it - id }
                _personalTimeline.update { map ->
                    map.mapValues { (_, ids) -> ids.filter { it != id } }
                }
                _exploreTimeline.update { list -> list.filter { it != id } }

                return true
            }
        }
    }

    suspend fun patchMemo(
        id: String,
        content: String?,
        visibility: String?,
        resources: List<Resource>?,
        createdAt: String?,
        isPinned: Boolean?,
        quoteMemo: PatchQuoteMemoField
    ): Boolean {
        val oldMemo = _memoEntities.value[id]
        val finalQuotedMemo =
            if (quoteMemo is PatchQuoteMemoField.Exist) quoteMemo.memo else if (quoteMemo is PatchQuoteMemoField.Empty) null else oldMemo
        _memoEntities.update { currentMap ->
            val oldMemo = currentMap[id] ?: return@update currentMap

            val updatedMemo = oldMemo.copy(
                content = content ?: oldMemo.content,
                visibility = visibility ?: oldMemo.visibility,
                resources = resources ?: oldMemo.resources,
                createdAt = createdAt ?: oldMemo.createdAt,
                isPinned = isPinned ?: oldMemo.isPinned,
                quotedMemo = finalQuotedMemo
            )

            currentMap + (id to updatedMemo)
        }
        var createdAtTimestamp: Long? = null
        if (createdAt != null) {
            val instant = Instant.parse(createdAt)
            val epochMillis = instant.toEpochMilliseconds()
            createdAtTimestamp = epochMillis
        }
        val patchBody = buildJsonObject {
            put("quoteId", finalQuotedMemo?.id)
            isPinned?.let { put("isPinned", it) }
            createdAtTimestamp?.let { put("createdAt", it) }
            visibility?.let { put("visibility", it) }
            resources?.let { list ->
                putJsonArray("resources") {
                    list.forEach { add(it.id) }
                }
            }
            content?.let { put("content", it) }
        }
        Log.d("PatchMemo", patchBody.toString())
        val response = memoApi.patchMemo(
            id,
            patchBody
        )
        when (val result = response.toApiResult()) {
            is ApiResult.Failure -> {
                if (oldMemo != null) {
                    _memoEntities.update { currentMap ->
                        currentMap + (id to oldMemo)
                    }
                }
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> {
                return true
            }
        }
    }

    suspend fun getUserAllResources(): List<Resource> {
        val response = resourceApi.getUserAllResources()
        when (val result = response.toApiResult()) {
            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> {
                return result.data
            }
        }
    }

    fun getMemoDetail(id: String): Flow<Memo> = flow {
        val inMemoryMemo = _memoEntities.value[id]
        if (inMemoryMemo != null) {
            emit(inMemoryMemo)
        }
        val response = memoApi.getMemoDetail(id)
        when (val result = response.toApiResult()) {
            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> {
                emit(result.data)
                updateEntities(listOf(result.data))
            }
        }
    }

    fun searchMemos(keyword: String): Flow<List<Memo>> = flow {
        val response = memoApi.searchMemos(keyword)
        when (val result = response.toApiResult()) {
            is ApiResult.Failure -> {
                throw BusinessException(result.code, result.errorMessage, result.traceId)
            }

            is ApiResult.Success -> {
                emit(result.data)
            }
        }
    }
}
