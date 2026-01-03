package com.roitium.nodal.ui.screens.memoDetail

import SnackbarManager
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.roitium.nodal.data.models.Memo
import com.roitium.nodal.data.repository.MemoRepository
import com.roitium.nodal.ui.navigation.NodalDestinations
import dagger.hilt.android.lifecycle.HiltViewModel
import jakarta.inject.Inject
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

sealed interface MemoDetailUiState {
    data object Loading : MemoDetailUiState
    data class Success(val memo: Memo) : MemoDetailUiState
    data class Error(val message: String) : MemoDetailUiState
}

@HiltViewModel
class MemoDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val memoRepository: MemoRepository
) : ViewModel() {
    private val memoId: String? = savedStateHandle[NodalDestinations.Args.MEMO_ID]

    val uiState: StateFlow<MemoDetailUiState> = flow {
        if (memoId == null) {
            emit(MemoDetailUiState.Error("Memo ID 为空"))
        } else {
            emitAll(
                memoRepository.getMemoDetail(memoId)
                    .map { memo -> MemoDetailUiState.Success(memo) }
                    .catch { e -> emit(MemoDetailUiState.Error(e.message ?: "加载失败")) }
            )
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = MemoDetailUiState.Loading
    )

    fun deleteMemo(onDeleteSuccess: () -> Unit) {
        if (memoId == null) return

        viewModelScope.launch {
            withContext(NonCancellable) {
                try {
                    memoRepository.deleteMemo(memoId)
                    SnackbarManager.showMessage("删除成功")
                    onDeleteSuccess()
                } catch (e: Exception) {
                    SnackbarManager.showMessage(e.message ?: "删除失败")
                }
            }
        }
    }
}