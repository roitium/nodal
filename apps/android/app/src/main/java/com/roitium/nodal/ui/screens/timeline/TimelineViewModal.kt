package com.roitium.nodal.ui.screens.timeline

import SnackbarManager
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.roitium.nodal.data.AuthState
import com.roitium.nodal.data.NodalRepository
import com.roitium.nodal.data.models.Cursor
import com.roitium.nodal.data.models.Memo
import dagger.hilt.android.lifecycle.HiltViewModel
import jakarta.inject.Inject
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterIsInstance
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class TimelineUiState(
    val memos: List<Memo> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val currentUsername: String? = null,
    val title: String = ""
)

@HiltViewModel
class TimelineViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val timelineType: String? = savedStateHandle["type"]
    private val targetUsername: String? = savedStateHandle["username"]

    // 分页游标 (保持在 VM 内部)
    var nextCursor: Cursor? = null

    // 标记是否还有更多数据
    private var hasMoreData = true

    // 内部 Loading 和 Error 状态流
    private val _isLoading = MutableStateFlow(false)
    private val _error = MutableStateFlow<String?>(null)

    private fun getTitle(type: String?, target: String?, actual: String?): String {
        return if (type == "global") "Explore"
        else if (target != null) "@$target"
        else if (actual != null) "@$actual"
        else "Your Memos"
    }

    private val targetUserFlow: Flow<String?> = flow {
        if (timelineType == "global") {
            emit(null)
        } else if (targetUsername != null) {
            emit(targetUsername)
        } else {
            NodalRepository.authState
                .filterIsInstance<AuthState.Authenticated>()
                .map { it.user.username }
                .collect { emit(it) }
        }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    val uiState: StateFlow<TimelineUiState> = targetUserFlow
        .flatMapLatest { username ->
            NodalRepository.getTimelineFlow(username).map { memos ->
                username to memos
            }
        }
        .combine(_isLoading) { (username, memos), loading ->
            TimelineUiState(
                memos = memos,
                isLoading = loading,
                currentUsername = username,
                title = getTitle(timelineType, targetUsername, username)
            )
        }
        .combine(_error) { state, error ->
            state.copy(error = error)
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = TimelineUiState(isLoading = true)
        )

    init {
        viewModelScope.launch {
            targetUserFlow.collectLatest { user ->
                // 只有当是刷新操作，或者列表为空时才去拉取
                internalLoadMemos(isRefresh = true, username = user)
            }
        }
    }

    fun loadMore() {
        val currentUser = uiState.value.currentUsername
        if (timelineType != "global" && currentUser == null) return

        internalLoadMemos(isRefresh = false, username = currentUser)
    }

    fun refresh() {
        val currentUser = uiState.value.currentUsername
        internalLoadMemos(isRefresh = true, username = currentUser)
    }

    private fun internalLoadMemos(isRefresh: Boolean, username: String?) {
        if (_isLoading.value) return
        if (!isRefresh && !hasMoreData) return

        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            try {
                val cursorToUse = if (isRefresh) null else nextCursor

                val response = NodalRepository.fetchTimeline(
                    cursorCreatedAt = cursorToUse?.createdAt,
                    cursorId = cursorToUse?.id,
                    username = username
                )

                if (response.data.isEmpty()) {
                    hasMoreData = false
                } else {
                    nextCursor = response.nextCursor
                    hasMoreData = response.nextCursor != null
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "加载失败"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteMemo(id: String) {
        viewModelScope.launch {
            try {
                NodalRepository.deleteMemo(id)
                SnackbarManager.showMessage("删除成功")
            } catch (e: Exception) {
                SnackbarManager.showMessage(e.message ?: "删除失败")
            }
        }
    }
}