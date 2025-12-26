package com.roitium.nodal.ui.screens.yourMemos

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.roitium.nodal.data.Cursor
import com.roitium.nodal.data.Memo
import com.roitium.nodal.data.NodalRepository
import kotlinx.coroutines.launch
import kotlin.collections.emptyList

class YourMemosViewModel : ViewModel() {
    var memos by mutableStateOf<List<Memo>>(emptyList())
        private set

    var isLoading by mutableStateOf(false)
        private set

    var error by mutableStateOf<String?>(null)
        private set

    var nextCursor: Cursor? = null

    init {
        loadMemos(isRefresh = true)
    }

    fun loadMemos(isRefresh: Boolean = false) {
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
                    cursorId = cursorToUse?.id
                )

                memos = if (isRefresh) response.data else memos + response.data
                nextCursor = response.nextCursor
            } catch (e: Exception) {
                error = e.message ?: "拉取时间线失败"
            } finally {
                isLoading = false
            }
        }
    }
}