package com.roitium.nodal.ui.screens.publish

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.roitium.nodal.data.models.Memo
import com.roitium.nodal.data.repository.MemoRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

sealed interface SearchUiState {
    data object Loading : SearchUiState
    data class Success(val data: List<Memo>, val matchedQuery: String) : SearchUiState
    data class Error(val message: String?) : SearchUiState
}

@HiltViewModel
class ReferMemoDialogViewModel @Inject constructor(
    private val memoRepository: MemoRepository
) : ViewModel() {
    private val _searchQuery = MutableStateFlow("")
    val searchQuery = _searchQuery.asStateFlow()

    @OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
    val uiState =
        _searchQuery
            .debounce(500)
            .flatMapLatest { query ->
                if (query.isBlank()) {
                    flowOf(SearchUiState.Success(emptyList(), ""))
                } else {
                    memoRepository.searchMemos(query)
                        .map { list -> SearchUiState.Success(list, query) as SearchUiState }
                        .onStart { emit(SearchUiState.Loading) }
                        .catch { e -> emit(SearchUiState.Error(e.message)) }
                }
            }.stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(5000),
                initialValue = SearchUiState.Success(emptyList(), "")
            )

    fun onSearchQueryChanged(query: String) {
        _searchQuery.value = query
    }
}