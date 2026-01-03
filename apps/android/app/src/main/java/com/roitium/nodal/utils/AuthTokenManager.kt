package com.roitium.nodal.utils

import CryptoManager
import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.roitium.nodal.data.models.User
import dagger.hilt.android.qualifiers.ApplicationContext
import jakarta.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import javax.inject.Inject

val Context.dataStore by preferencesDataStore(name = "secret_settings")

sealed class AuthState {
    object Initializing : AuthState()
    data class Authenticated(val user: User, val token: String) : AuthState()
    object Unauthenticated : AuthState()
}

@Singleton
class AuthTokenManager @Inject constructor(@ApplicationContext context: Context) {
    private val dataStore = context.dataStore
    private val cryptoManager = CryptoManager(context)
    private val AUTH_TOKEN_KEY = stringPreferencesKey("auth_token")
    private val USER_JSON_KEY = stringPreferencesKey("user_json")

    @Volatile
    var cachedToken: String? = null
        private set

    val authStateFlow: Flow<AuthState> = dataStore.data
        .map { preferences ->
            val encryptedJson = preferences[USER_JSON_KEY]
            val encryptedToken = preferences[AUTH_TOKEN_KEY]

            if (encryptedJson == null || encryptedToken == null) {
                AuthState.Unauthenticated
            } else {
                try {
                    val token = cryptoManager.decrypt(encryptedToken)
                    val jsonStr = cryptoManager.decrypt(encryptedJson)
                    if (jsonStr != null && token != null) {
                        val user = Json.decodeFromString<User>(jsonStr)
                        cachedToken = token
                        AuthState.Authenticated(user, token)
                    } else {
                        AuthState.Unauthenticated
                    }
                } catch (e: Exception) {
                    AuthState.Unauthenticated
                }
            }
        }

    suspend fun saveAuthInfo(token: String, user: User) {
        val encryptedToken = cryptoManager.encrypt(token)
        val jsonString = Json.encodeToString(user)
        val encryptedJson = cryptoManager.encrypt(jsonString)
        dataStore.edit { preferences ->
            preferences[AUTH_TOKEN_KEY] = encryptedToken
            preferences[USER_JSON_KEY] = encryptedJson
        }
        return
    }

    suspend fun clearAuthInfo() {
        dataStore.edit { preferences ->
            preferences.remove(AUTH_TOKEN_KEY)
            preferences.remove(USER_JSON_KEY)
        }
    }
}