package com.roitium.nodal.ui.screens.resource

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.roitium.nodal.data.models.Resource
import com.roitium.nodal.data.repository.ResourceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import jakarta.inject.Inject
import kotlinx.coroutines.launch

@HiltViewModel
class ResourceViewModel @Inject constructor(
    private val resourceRepository: ResourceRepository
) : ViewModel() {
    var resources by mutableStateOf<List<Resource>>(emptyList())
        private set

    var error by mutableStateOf<String?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set


    init {
        getResourceList()
    }

    fun getResourceList() {
        viewModelScope.launch {
            try {
                isLoading = true
                val data = resourceRepository.getUserAllResources()
                resources = data
                Log.d("ResourceScreen", data.size.toString())
            } catch (e: Exception) {
                error = e.message
            } finally {
                isLoading = false
            }
        }
    }
}