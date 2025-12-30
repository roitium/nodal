package com.roitium.nodal.ui.screens.register

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.roitium.nodal.data.NodalRepository
import com.roitium.nodal.data.RegisterRequest
import kotlinx.coroutines.launch

class RegisterViewModel : ViewModel() {
    var username by mutableStateOf("")
    var email by mutableStateOf("")
    var password by mutableStateOf("")
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    fun onUsernameChanged(newUsername: String) {
        username = newUsername
    }

    fun onEmailChanged(newEmail: String) {
        email = newEmail
    }

    fun onPasswordChanged(newPassword: String) {
        password = newPassword
    }

    fun register(onSuccess: () -> Unit) {
        if (isLoading) return

        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                NodalRepository.register(RegisterRequest(username, email, password))
                onSuccess()
            } catch (e: Exception) {
                error = e.message ?: "Registration failed"
            } finally {
                isLoading = false
            }
        }
    }
}
