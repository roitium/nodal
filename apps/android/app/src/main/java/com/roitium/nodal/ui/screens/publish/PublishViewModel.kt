package com.roitium.nodal.ui.screens.publish

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

    fun publish(onSuccess: () -> Unit) {
        if (isLoading) return

        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                NodalRepository.publish(
                    content = content,
                    visibility = if (isPrivate) "private" else "public"
                )
                onSuccess()
            } catch (e: Exception) {
                error = e.message
            } finally {
                isLoading = false
            }
        }
    }
}
