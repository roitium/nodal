package com.roitium.nodal.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

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
    val size: Int
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
