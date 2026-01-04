package com.roitium.nodal.data.models

import com.roitium.nodal.data.local.entity.MemoEntity
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
data class ApiMemo(
    val id: String,
    val content: String,
    val userId: String,
    val visibility: String = "public",
    val isPinned: Boolean = false,
    val createdAt: String,
    val author: User,
    val resources: List<Resource> = emptyList(),
    val replies: List<ApiMemo> = emptyList(),
    val quotedMemo: ApiQuotedMemo? = null,
    val updatedAt: String,
    val parentId: String?
)

@Serializable
data class ApiQuotedMemo(
    val id: String,
    val content: String,
    val userId: String,
    val visibility: String = "public",
    val isPinned: Boolean = false,
    val createdAt: String,
    val author: User,
    val updatedAt: String,
    val parentId: String?,
    val quoteId: String?
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
    val resources: List<String> = emptyList(),
    val id: String? = null
)

@Serializable
data class TimelineResponse(
    val data: List<ApiMemo>,
    val nextCursor: Cursor? = null
)

@Serializable
data class Cursor(
    val createdAt: String,
    val id: String
)

@Serializable
data class UploadUrlResponse(
    val uploadUrl: String,
    val path: String,
    val headers: Map<String, String>? = null,
    val signature: String
)

@Serializable
data class RecordUploadRequest(
    val path: String,
    val fileType: String,
    val fileSize: Long,
    val filename: String,
    val signature: String
)

sealed interface PatchQuoteMemoField {
    data object Empty : PatchQuoteMemoField
    data class Exist(val memo: MemoEntity) : PatchQuoteMemoField
}