package com.roitium.nodal.ui.components

import android.text.format.DateUtils
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.mikepenz.markdown.coil2.Coil2ImageTransformerImpl
import com.mikepenz.markdown.compose.components.markdownComponents
import com.mikepenz.markdown.compose.elements.highlightedCodeBlock
import com.mikepenz.markdown.compose.elements.highlightedCodeFence
import com.mikepenz.markdown.m3.Markdown
import com.roitium.nodal.data.Memo
import com.roitium.nodal.data.NodalRepository
import kotlinx.coroutines.launch
import java.time.Instant

@Composable
fun MemoCard(
    memo: Memo,
    onClickImage: (url: String?) -> Unit,
    onDelete: (id: String) -> Unit,
    showSnackbar: (message: String) -> Unit
) {
    var showDeleteDialog by remember { mutableStateOf(false) }
    var expandedDropdownMenu by remember { mutableStateOf(false) }
    var editMode by remember { mutableStateOf(false) }
    var memoContent by remember { mutableStateOf(memo.content) }
    var memoVisibility by remember { mutableStateOf(memo.visibility) }
    var memoCreatedAt by remember { mutableStateOf(memo.createdAt) }
    var memoResources by remember { mutableStateOf(memo.resources) }

    val scope = rememberCoroutineScope()

    fun editMemo() {
        editMode = false
        scope.launch {
            try {
                NodalRepository.patchMemo(
                    memo.id,
                    memoContent,
                    memoVisibility,
                    memoResources.map { it.id },
                    Instant.parse(memoCreatedAt).toEpochMilli(),
                    null,
                    null
                )
            } catch (e: Exception) {
                showSnackbar(e.message ?: "修改失败")
            }
            showSnackbar("修改成功")
        }
    }


    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                AsyncImage(
                    model = memo.author?.avatarUrl,
                    contentDescription = "Avatar",
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = memo.author?.displayName ?: memo.author?.username ?: "Unknown",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = DateUtils.getRelativeTimeSpanString(
                            Instant.parse(memoCreatedAt).toEpochMilli(),
                            System.currentTimeMillis(),
                            DateUtils.MINUTE_IN_MILLIS,
                            DateUtils.FORMAT_ABBREV_RELATIVE
                        ).toString(),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                IconButton(onClick = { expandedDropdownMenu = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "more actions")
                    DropdownMenu(
                        expanded = expandedDropdownMenu,
                        onDismissRequest = { expandedDropdownMenu = false }) {
                        DropdownMenuItem(text = { Text("修改") }, onClick = {
                            expandedDropdownMenu = false
                            editMode = true
                        })
                        DropdownMenuItem(text = {
                            Text(
                                "删除 memo",
                                color = MaterialTheme.colorScheme.error
                            )
                        }, onClick = {
                            showDeleteDialog = true
                            expandedDropdownMenu = false
                        })
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            if (editMode) {
                OutlinedTextField(
                    value = memoContent,
                    onValueChange = { memoContent = it },
                    modifier = Modifier.fillMaxWidth(),
                )
                if (memoResources.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(16.dp))
                    memoResources.forEach { resource ->
                        Box(
                            modifier = Modifier
                                .padding(4.dp)
                                .size(80.dp)
                        ) {
                            AsyncImage(
                                model = resource.externalLink,
                                contentDescription = "Resource",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .matchParentSize()
                                    .clip(RoundedCornerShape(8.dp))
                            )

                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(4.dp)
                                    .size(20.dp)
                                    .background(
                                        color = Color.Black.copy(alpha = 0.5f),
                                        shape = CircleShape
                                    )
                                    .clickable {
                                        memoResources = memoResources.filter { it != resource }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "Remove",
                                    tint = Color.White,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = memoVisibility == "private",
                            onCheckedChange = { visibility ->
                                memoVisibility = if (visibility) "private" else "public"
                            }
                        )
                        Text("私密")
                    }
                    Spacer(modifier = Modifier.weight(1f))
                    TextButton(onClick = {
                        editMode = false
                        memoContent = memo.content
                        memoVisibility = memo.visibility
                        memoCreatedAt = memo.createdAt
                        memoResources = memo.resources
                    }) {
                        Text("取消")
                    }
                    TextButton(onClick = {
                        editMemo()
                    }) {
                        Text("保存")
                    }
                }
            } else {
                Markdown(
                    memoContent.trimIndent(),
                    imageTransformer = Coil2ImageTransformerImpl,
                    components = markdownComponents(
                        codeBlock = highlightedCodeBlock,
                        codeFence = highlightedCodeFence,
                    )
                )
                if (memoResources.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    memoResources.forEach { resource ->
                        AsyncImage(
                            model = resource.externalLink,
                            contentDescription = "Resource",
                            modifier = Modifier
                                .size(80.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .clickable {
                                    onClickImage(resource.externalLink)
                                },
                            contentScale = ContentScale.Crop
                        )
                    }
                }

                if (memoVisibility == "private") {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "私密",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text(text = "确认删除") },
            text = { Text(text = "确定要删除这条 Memo 吗？此操作无法撤销。") },
            confirmButton = {
                TextButton(
                    onClick = {
                        onDelete(memo.id)
                        showDeleteDialog = false
                    }
                ) {
                    Text("删除", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("取消")
                }
            }
        )
    }
}