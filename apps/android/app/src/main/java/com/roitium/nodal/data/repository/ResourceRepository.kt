package com.roitium.nodal.data.repository

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import com.roitium.nodal.data.api.NodalResourceApi
import com.roitium.nodal.data.models.ApiResult
import com.roitium.nodal.data.models.RecordUploadRequest
import com.roitium.nodal.data.models.Resource
import com.roitium.nodal.exceptions.BusinessException
import dagger.hilt.android.qualifiers.ApplicationContext
import jakarta.inject.Inject
import jakarta.inject.Singleton
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody

@Singleton
class ResourceRepository @Inject constructor(
    private val resourceApi: NodalResourceApi,
    @ApplicationContext private val context: Context
) {
    suspend fun uploadFile(context: Context, uri: Uri): Resource {
        val contentResolver = context.contentResolver
        val type = contentResolver.getType(uri) ?: "application/octet-stream"
        val ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(type) ?: "bin"

        val uploadUrlResponse = resourceApi.getUploadUrl(type, ext)
        val uploadInfo = when (val result = uploadUrlResponse.toApiResult()) {
            is ApiResult.Failure -> throw BusinessException(
                result.code,
                result.errorMessage,
                result.traceId
            )

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
                filename = filename,
                signature = uploadInfo.signature
            )
        )

        return when (val result = recordResponse.toApiResult()) {
            is ApiResult.Failure -> throw BusinessException(
                result.code,
                result.errorMessage,
                result.traceId
            )

            is ApiResult.Success -> result.data
        }
    }

    suspend fun getUserAllResources(): List<Resource> {
        val response = resourceApi.getUserAllResources()
        return when (val result = response.toApiResult()) {
            is ApiResult.Failure -> throw BusinessException(
                result.code,
                result.errorMessage,
                result.traceId
            )

            is ApiResult.Success -> result.data
        }
    }
}