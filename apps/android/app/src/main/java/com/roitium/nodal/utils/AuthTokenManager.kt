package com.roitium.nodal.utils

import CryptoManager
import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.roitium.nodal.data.AuthState
import com.roitium.nodal.data.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json

val Context.dataStore by preferencesDataStore(name = "secret_settings")

class AuthTokenManager(private val context: Context) {
    private val cryptoManager = CryptoManager(context)
    private val AUTH_TOKEN_KEY = stringPreferencesKey("auth_token")
    private val USER_JSON_KEY = stringPreferencesKey("user_json")

    val authStateFlow: Flow<AuthState> = context.dataStore.data
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
        context.dataStore.edit { preferences ->
            preferences[AUTH_TOKEN_KEY] = encryptedToken
            preferences[USER_JSON_KEY] = encryptedJson
        }
        return
    }

    suspend fun clearAuthInfo() {
        context.dataStore.edit { preferences ->
            preferences.remove(AUTH_TOKEN_KEY)
            preferences.remove(USER_JSON_KEY)
        }
    }
}