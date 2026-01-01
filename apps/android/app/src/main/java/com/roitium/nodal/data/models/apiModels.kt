package com.roitium.nodal.data.models

import kotlinx.serialization.Serializable

@Serializable
data class Response<TData>(
    val data: TData? = null,
    val error: String? = null,
    val traceId: String,
    val code: Int,
    val timestamp: Long
) {
    fun toApiResult(): ApiResult<TData> {
        return if (error == null && data != null) {
            ApiResult.Success(data)
        } else {
            ApiResult.Failure(error ?: "Unknown Error", code, traceId)
        }
    }
}


sealed class ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>()
    data class Failure(val errorMessage: String, val code: Int, val traceId: String) :
        ApiResult<Nothing>()
}

@Serializable
data class User(
    val id: String,
    val username: String,
    val displayName: String? = null,
    val avatarUrl: String? = null,
    val bio: String? = null,
    val createdAt: String? = null
)

@Serializable
data class Memo(
    val id: String,
    val content: String,
    val userId: String,
    val visibility: String = "public",
    val isPinned: Boolean = false,
    val createdAt: String,
    val author: User? = null,
    val resources: List<Resource> = emptyList(),
    val replies: List<Memo> = emptyList(),
    val quotedMemo: Memo? = null
)

@Serializable
data class Resource(
    val id: String,
    val externalLink: String? = null,
    val type: String,
    val size: Int,
    val createdAt: String,
    val filename: String,
    val memoId: String?
)

@Serializable
data class AuthResponse(
    val token: String,
    val user: User
)

@Serializable
data class RegisterRequest(
    val username: String,
    val email: String,
    val password: String
)

@Serializable
data class LoginRequest(
    val login: String,
    val password: String
)

@Serializable
data class PublishRequest(
    val content: String,
    val visibility: String = "public",
    val parentId: String? = null,
    val quoteId: String? = null,
    val isPinned: Boolean = false,
    val resources: List<String> = emptyList()
)

@Serializable
data class TimelineResponse(
    val data: List<Memo>,
    val nextCursor: Cursor? = null
)

@Serializable
data class Cursor(
    val createdAt: Long,
    val id: String
)

@Serializable
data class UploadUrlResponse(
    val uploadUrl: String,
    val path: String,
    val headers: Map<String, String>? = null
)

@Serializable
data class RecordUploadRequest(
    val path: String,
    val fileType: String,
    val fileSize: Long,
    val filename: String
)

@Serializable
data class PatchMemoRequest(
    val content: String?,
    val visibility: String?,
    val quoteId: String?,
    val resources: List<String>?,
    val createdAt: Long?,
    val isPinned: Boolean?
)
