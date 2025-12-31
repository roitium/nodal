package com.roitium.nodal.ui.screens.publish

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.BasicAlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.roitium.nodal.data.Memo
import com.roitium.nodal.data.NodalRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReferMemoDialog(
    showDialog: Boolean,
    onDismiss: () -> Unit,
    onSetReferredMemo: (Memo) -> Unit
) {
    var text by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    val searchResult = remember { mutableStateListOf<Memo>() }
    val scope = rememberCoroutineScope()
    val keyboardController = LocalSoftwareKeyboardController.current

    fun searchMemos() {
        scope.launch {
            try {
                val result = NodalRepository.searchMemos(text)
                searchResult.clear()
                searchResult.addAll(result)
            } catch (e: Exception) {
                error = e.message
            }
        }
    }

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
                        trailingIcon = {
                            IconButton(onClick = {
                                searchMemos()
                            }) {
                                Icon(
                                    imageVector = Icons.Default.Search,
                                    contentDescription = "Search"
                                )
                            }
                        },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(
                            onSearch = {
                                searchMemos()
                            }
                        )
                    )
                    if (error != null) {
                        Text(
                            text = error!!,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(horizontal = 16.dp)
                        )
                    }
                    if (searchResult.isNotEmpty()) {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 16.dp)
                                .heightIn(max = 200.dp)
                        ) {
                            items(items = searchResult, key = { it.id }) { memo ->
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
                    } else if (text.isNotEmpty()) {
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

@Preview
@Composable
private fun ReferMemoDialogPreview() {
    ReferMemoDialog(showDialog = true, onDismiss = {}, onSetReferredMemo = {})
}