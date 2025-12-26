package com.roitium.nodal.ui.screens.publish

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.roitium.nodal.data.NodalRepository
import kotlinx.coroutines.launch

class PublishViewModel : ViewModel() {
    var content by mutableStateOf("")
    var isPrivate by mutableStateOf(false)
    var selectedUris by mutableStateOf<List<Uri>>(emptyList())
        private set
    
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    fun onContentChanged(newContent: String) {
        content = newContent
    }

    fun onIsPrivateChanged(newIsPrivate: Boolean) {
        isPrivate = newIsPrivate
    }
    
    fun onUrisSelected(uris: List<Uri>) {
        selectedUris = selectedUris + uris
    }
    
    fun onRemoveUri(uri: Uri) {
        selectedUris = selectedUris - uri
    }

    fun publish(context: Context, onSuccess: () -> Unit) {
        if (isLoading) return

        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                // Upload files first
                val resourceIds = selectedUris.map { uri ->
                    val resource = NodalRepository.uploadFile(context, uri)
                    resource.id
                }
                
                NodalRepository.publish(
                    content = content,
                    visibility = if (isPrivate) "private" else "public",
                    resources = resourceIds
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
