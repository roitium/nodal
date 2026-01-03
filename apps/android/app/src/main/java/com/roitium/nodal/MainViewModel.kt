package com.roitium.nodal

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.roitium.nodal.data.repository.AuthRepository
import com.roitium.nodal.utils.AuthState
import com.roitium.nodal.utils.AuthTokenManager
import dagger.hilt.android.lifecycle.HiltViewModel
import jakarta.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn

@HiltViewModel
class MainViewModel @Inject constructor(
    private val authTokenManager: AuthTokenManager,
    private val authRepository: AuthRepository
) : ViewModel() {
    val authState = authTokenManager.authStateFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AuthState.Initializing)

    suspend fun logout() {
        authRepository.logout()
    }
}