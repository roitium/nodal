package com.roitium.nodal.ui.screens.login

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.roitium.nodal.data.LoginRequest
import com.roitium.nodal.data.NodalRepository
import kotlinx.coroutines.launch

class LoginViewModel : ViewModel() {
    var login by mutableStateOf("")
    var password by mutableStateOf("")
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    fun onLoginChanged(newLogin: String) {
        login = newLogin
    }

    fun onPasswordChanged(newPassword: String) {
        password = newPassword
    }

    fun login(onSuccess: () -> Unit) {
        if (isLoading) return

        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                NodalRepository.login(LoginRequest(login, password))
                onSuccess()
            } catch (e: Exception) {
                error = e.message ?: "Login failed"
            } finally {
                isLoading = false
            }
        }
    }
}
