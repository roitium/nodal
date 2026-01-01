package com.roitium.nodal.ui.screens.publish

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.roitium.nodal.data.NodalRepository
import com.roitium.nodal.data.models.Memo
import com.roitium.nodal.data.models.Resource
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.launch

data class ResourceUri(
    val uri: Uri,
    val isLoading: Boolean = true
)

class PublishViewModel : ViewModel() {
    var content by mutableStateOf("")
    var isPrivate by mutableStateOf(false)
    var selectedResources by mutableStateOf<List<ResourceUri>>(emptyList())
        private set

    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    var uploadedResources = emptyList<Resource>()
    var referredMemo by mutableStateOf<Memo?>(null)
        private set

    fun updateReferredMemoId(memo: Memo) {
        referredMemo = memo
    }


    fun onContentChanged(newContent: String) {
        content = newContent
    }

    fun onIsPrivateChanged(newIsPrivate: Boolean) {
        isPrivate = newIsPrivate
    }

    fun onResourcesSelected(items: List<ResourceUri>, context: Context) {
        selectedResources = selectedResources + items
        viewModelScope.launch {
            isLoading = true

            try {
                items.map { item ->
                    async {
                        try {
                            val resource = NodalRepository.uploadFile(context, item.uri)
                            uploadedResources = uploadedResources + resource
                        } catch (e: Exception) {
                            onRemoveResource(item)
                            error = e.message
                        } finally {
                            val newItem = item.copy(isLoading = false)

                            selectedResources = selectedResources.map { currentItem ->
                                if (currentItem == item) newItem else currentItem
                            }
                        }
                    }
                }.awaitAll()

            } finally {
                isLoading = false
            }
        }
    }

    fun onRemoveResource(item: ResourceUri) {
        selectedResources = selectedResources - item
    }

    fun publish(onSuccess: () -> Unit) {
        if (isLoading) return
        for (resource in selectedResources) {
            // 还没上传完
            if (resource.isLoading) return
        }
        if (content.isBlank()) return

        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                NodalRepository.publish(
                    content = content,
                    visibility = if (isPrivate) "private" else "public",
                    resources = uploadedResources.map { it.id },
                    referredMemoId = referredMemo?.id
                )
                onSuccess()
            } catch (e: Exception) {
                // Handle error
                error = e.message
            } finally {
                isLoading = false
            }
        }
    }
}
