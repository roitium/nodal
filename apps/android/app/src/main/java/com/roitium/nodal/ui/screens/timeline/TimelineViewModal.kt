package com.roitium.nodal.ui.screens.timeline

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.createSavedStateHandle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.roitium.nodal.data.AuthState
import com.roitium.nodal.data.Cursor
import com.roitium.nodal.data.Memo
import com.roitium.nodal.data.NodalRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch

class TimelineViewModel(private val savedStateHandle: SavedStateHandle) : ViewModel() {
    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val savedStateHandle = createSavedStateHandle()

                TimelineViewModel(
                    savedStateHandle = savedStateHandle
                )
            }
        }
    }

    private val timelineType: String? = savedStateHandle["type"]
    private val targetUsername: String? = savedStateHandle["username"]

    private var _memos = mutableStateListOf<Memo>()

    val memos: List<Memo> get() = _memos

    var isLoading by mutableStateOf(false)
        private set

    var error by mutableStateOf<String?>(null)
        private set

    var nextCursor: Cursor? = null

    var currentUsername: String? = targetUsername
    var appBarTitle =
        if (timelineType == "global") "Explore" else if (targetUsername != null) "@$targetUsername" else "Your Memos"

    private val _snackbarEvent = Channel<String>()

    val snackbarEvent = _snackbarEvent.receiveAsFlow()

    fun showSnackbar(message: String) {
        viewModelScope.launch {
            _snackbarEvent.send(message)
        }
    }

    init {
        if (timelineType == "global") {
            internalLoadMemos(isRefresh = true, null)
        } else {
            observeAuthState()
        }
    }

    private fun observeAuthState() {
        viewModelScope.launch {
            NodalRepository.authState.collectLatest { authState ->
                if (authState is AuthState.Authenticated) {
                    val userToLoad = targetUsername ?: authState.user.username
                    currentUsername = userToLoad
                    internalLoadMemos(isRefresh = true, username = userToLoad)
                } else {
                    _memos.clear()
                }
            }
        }
    }

    fun loadMemos(isRefresh: Boolean = false) {
        if (timelineType == "global") {
            internalLoadMemos(isRefresh = isRefresh, null)
        } else {
            internalLoadMemos(isRefresh, currentUsername)
        }
    }

    private fun internalLoadMemos(isRefresh: Boolean = false, username: String?) {
        if (isLoading) return

        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                val cursorToUse = if (isRefresh) null else nextCursor

                // 校验逻辑
                if (!isRefresh && memos.isNotEmpty() && cursorToUse == null) return@launch

                val response = NodalRepository.getTimeline(
                    cursorCreatedAt = cursorToUse?.createdAt,
                    cursorId = cursorToUse?.id,
                    username = username
                )

                if (isRefresh) {
                    _memos.clear()
                }
                _memos.addAll(response.data)
                nextCursor = response.nextCursor
            } catch (e: Exception) {
                error = e.message ?: "拉取时间线失败"
            } finally {
                isLoading = false
            }
        }
    }

    fun deleteMemo(id: String) {
        val memoToDelete = _memos.find { it.id == id } ?: return
        val originalIndex = _memos.indexOf(memoToDelete)

        viewModelScope.launch {
            _memos.remove(memoToDelete)
            try {
                NodalRepository.deleteMemo(id)
                showSnackbar("删除成功")
            } catch (e: Exception) {
                showSnackbar(e.message ?: "删除失败")
                _memos.add(originalIndex, memoToDelete)
            }
        }
    }
}