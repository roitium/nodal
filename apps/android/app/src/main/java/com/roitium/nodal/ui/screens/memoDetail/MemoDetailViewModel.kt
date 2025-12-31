package com.roitium.nodal.ui.screens.memoDetail

import SnackbarManager
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.roitium.nodal.data.Memo
import com.roitium.nodal.data.NodalRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import jakarta.inject.Inject
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@HiltViewModel
class MemoDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    var memo by mutableStateOf<Memo?>(null)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set

    val memoId: String? = savedStateHandle["memoId"]

    init {
        loadMemoDetail()
    }

    fun loadMemoDetail() {
        isLoading = true
        if (memoId == null) {
            error = "memoId 为空"
            isLoading = false
        } else {
            viewModelScope.launch {
                try {
                    memo = NodalRepository.getMemoDetail(memoId)
                } catch (e: Exception) {
                    error = e.message
                } finally {
                    isLoading = false
                }
            }
        }
    }

    fun deleteMemo() {
        if (memoId == null) {
            error = "memoId 为空"
        } else {
            viewModelScope.launch {
                withContext(NonCancellable) {
                    try {
                        NodalRepository.deleteMemo(memoId)
                        SnackbarManager.showMessage("删除成功")
                    } catch (e: Exception) {
                        SnackbarManager.showMessage(e.message ?: "删除失败")
                    }
                }
            }
        }
    }
}