package com.roitium.nodal.ui.screens.publish

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.BasicAlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.roitium.nodal.data.NodalRepository
import com.roitium.nodal.data.models.Memo
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart

sealed interface SearchUiState {
    data object Loading : SearchUiState
    data class Success(val data: List<Memo>, val matchedQuery: String) : SearchUiState
    data class Error(val message: String?) : SearchUiState
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalCoroutinesApi::class, FlowPreview::class)
@Composable
fun ReferMemoDialog(
    showDialog: Boolean,
    onDismiss: () -> Unit,
    onSetReferredMemo: (Memo) -> Unit
) {
    var text by remember { mutableStateOf("") }
    val keyboardController = LocalSoftwareKeyboardController.current
    val uiState: SearchUiState by remember {
        snapshotFlow { text }
            .debounce(500)
            .flatMapLatest { query ->
                if (query.isBlank()) {
                    flowOf(SearchUiState.Success(emptyList(), ""))
                } else {
                    NodalRepository.searchMemos(query)
                        .map { list -> SearchUiState.Success(list, query) as SearchUiState }
                        .onStart { emit(SearchUiState.Loading) }
                        .catch { e -> emit(SearchUiState.Error(e.message)) }
                }
            }
    }.collectAsStateWithLifecycle(initialValue = SearchUiState.Loading)

    if (showDialog) {
        BasicAlertDialog(
            onDismissRequest = onDismiss
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 300.dp)
                    .padding(16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainer
                )
            ) {
                Column {
                    Text(
                        "引用 Memo",
                        modifier = Modifier
                            .padding(16.dp)
                            .fillMaxWidth(),
                        textAlign = TextAlign.Center,
                        style = MaterialTheme.typography.titleMedium
                    )
                    OutlinedTextField(
                        value = text,
                        onValueChange = { text = it },
                        modifier = Modifier
                            .padding(horizontal = 16.dp)
                            .fillMaxWidth(),
                        placeholder = {
                            Text(
                                "搜索 memos"
                            )
                        },
                        maxLines = 1,
                    )
                    when (val state = uiState) {
                        SearchUiState.Loading -> {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(24.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp))
                            }
                        }

                        is SearchUiState.Error -> {
                            Text(
                                text = state.message ?: "未知错误",
                                color = MaterialTheme.colorScheme.error,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )
                        }

                        is SearchUiState.Success -> {
                            val isDataFresh = state.matchedQuery == text
                            if (state.data.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(32.dp))
                                HorizontalDivider()
                                LazyColumn(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .heightIn(max = 200.dp)
                                ) {
                                    items(items = state.data, key = { it.id }) { memo ->
                                        ListItem(
                                            headlineContent = {
                                                Text(
                                                    text = memo.content,
                                                    maxLines = 3,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            },
                                            leadingContent = {
                                                Icon(
                                                    Icons.Default.Edit,
                                                    contentDescription = null
                                                )
                                            },
                                            colors = ListItemDefaults.colors(
                                                containerColor = MaterialTheme.colorScheme.surfaceContainer
                                            ),
                                            modifier = Modifier
                                                .clickable {
                                                    onSetReferredMemo(memo)
                                                    keyboardController?.hide()
                                                    onDismiss()
                                                }
                                        )
                                        HorizontalDivider()
                                    }
                                }
                            } else {
                                // 只有在数据和 query 匹配时才是真的不存在。否则可能只是初始状态，debounce 还没结束
                                if (text.isNotEmpty() && isDataFresh) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(24.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            "没有找到相关 Memo",
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Preview
@Composable
private fun ReferMemoDialogPreview() {
    ReferMemoDialog(showDialog = true, onDismiss = {}, onSetReferredMemo = {})
}