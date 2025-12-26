package com.roitium.nodal.data

import android.annotation.SuppressLint
import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

object NodalRepository {
    private const val BASE_URL = "https://nodal.roitium.com/"
    private var authToken: String? = null
    var currentUser: User? = null
        private set

    private var sharedPreferences: android.content.SharedPreferences? = null

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    fun initialize(context: Context) {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        sharedPreferences = EncryptedSharedPreferences.create(
            context,
            "secret_shared_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )

        authToken = sharedPreferences?.getString("auth_token", null)
        val userJson = sharedPreferences?.getString("user_json", null)
        if (userJson != null) {
            try {
                currentUser = json.decodeFromString<User>(userJson)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val token = authToken
        if (token != null) {
            chain.proceed(
                original.newBuilder()
                    .header("Authorization", "Bearer $token")
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

    private val api: NodalApi = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(NodalApi::class.java)

    fun isLoggedIn(): Boolean = authToken != null

    @SuppressLint("UseKtx")
    fun logout() {
        authToken = null
        currentUser = null
        sharedPreferences?.edit()?.clear()?.apply()
    }

    @SuppressLint("UseKtx")
    private fun saveAuthData(token: String, user: User) {
        authToken = token
        currentUser = user
        sharedPreferences?.edit()
            ?.putString("auth_token", token)
            ?.putString("user_json", json.encodeToString(user))
            ?.apply()
    }

    suspend fun login(req: LoginRequest): AuthResponse {
        val response = api.login(req)
        saveAuthData(response.token, response.user)
        return response
    }

    suspend fun register(req: RegisterRequest): AuthResponse {
        val response = api.register(req)
        saveAuthData(response.token, response.user)
        return response
    }

    suspend fun getTimeline(
        limit: Int? = 20,
        cursorCreatedAt: Long? = null,
        cursorId: String? = null,
        username: String? = null
    ) = api.getTimeline(limit, cursorCreatedAt, cursorId, username)

    suspend fun publish(
        content: String,
        visibility: String = "public",
        resources: List<String> = emptyList()
    ): Memo {
        return api.publish(
            PublishRequest(
                content = content,
                visibility = visibility,
                resources = resources
            )
        )
    }

    suspend fun uploadFile(context: Context, uri: android.net.Uri): Resource {
        val contentResolver = context.contentResolver
        val type = contentResolver.getType(uri) ?: "application/octet-stream"
        val ext = android.webkit.MimeTypeMap.getSingleton().getExtensionFromMimeType(type) ?: "bin"

        // 1. Get Upload URL
        val uploadUrlRes = api.getUploadUrl(type, ext)

        // 2. Upload Content
        val inputStream = contentResolver.openInputStream(uri) ?: throw Exception("Cannot open URI")
        val bytes = inputStream.readBytes()
        inputStream.close()

        val requestBody = okhttp3.RequestBody.create(type.toMediaType(), bytes)
        val uploadResponse = api.uploadFileContent(uploadUrlRes.uploadUrl, requestBody)

        if (!uploadResponse.isSuccessful) {
            throw Exception("Upload failed: ${uploadResponse.code()}")
        }

        // 3. Record Upload
        val filename = try {
            var name = "unknown"
            val cursor = contentResolver.query(uri, null, null, null, null)
            cursor?.use {
                if (it.moveToFirst()) {
                    val nameIndex = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                    if (nameIndex >= 0) name = it.getString(nameIndex)
                }
            }
            name
        } catch (e: Exception) {
            "unknown.$ext"
        }

        return api.recordUpload(
            RecordUploadRequest(
                path = uploadUrlRes.path,
                fileType = type,
                fileSize = bytes.size.toLong(),
                filename = filename
            )
        )
    }
}
