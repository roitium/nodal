package com.roitium.nodal.ui.components

import android.text.format.DateUtils
import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material.icons.automirrored.filled.ArrowRightAlt
import androidx.compose.material.icons.automirrored.filled.Comment
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.RemoveRedEye
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CardElevation
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.CachePolicy
import coil.request.ImageRequest
import com.mikepenz.markdown.coil2.Coil2ImageTransformerImpl
import com.mikepenz.markdown.compose.components.markdownComponents
import com.mikepenz.markdown.compose.elements.highlightedCodeBlock
import com.mikepenz.markdown.compose.elements.highlightedCodeFence
import com.mikepenz.markdown.m3.Markdown
import com.roitium.nodal.data.models.Memo
import java.time.Instant

@Composable
fun MemoCard(
    memo: Memo,
    containerColor: Color = MaterialTheme.colorScheme.surfaceContainer,
    elevation: CardElevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
    containerModifier: Modifier = Modifier,
    onlyShowContent: Boolean = false,
    onClickImage: (url: String?) -> Unit,
    onDelete: (id: String) -> Unit,
    onClickMemo: ((id: String) -> Unit)?,
    onClickReferredMemo: ((id: String) -> Unit)?,
    onClickEdit: (id: String) -> Unit,
    onClickReply: (id: String) -> Unit,
    animatedVisibilityScope: AnimatedVisibilityScope,
    sharedTransitionScope: SharedTransitionScope,
    imageSharedContentKeyPrefix: String,
    onClickAvatar: (username: String) -> Unit,
) {
    var showDeleteDialog by remember { mutableStateOf(false) }
    var expandedDropdownMenu by remember { mutableStateOf(false) }

    Card(
        modifier = containerModifier
            .fillMaxWidth()
            .then(
                if (onClickMemo != null) {
                    Modifier.clickable { onClickMemo(memo.id) }
                } else {
                    Modifier
                }
            ),
        elevation = elevation,
        colors = CardDefaults.cardColors(
            containerColor = containerColor,
        ),
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(memo.author?.avatarUrl)
                        .diskCachePolicy(CachePolicy.ENABLED)
                        .memoryCachePolicy(CachePolicy.ENABLED)
                        .build(),
                    contentDescription = "Avatar",
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .clickable {
                            onClickAvatar(memo.author?.username ?: "")
                        },
                    contentScale = ContentScale.Crop,
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = memo.author?.displayName ?: memo.author?.username ?: "Unknown",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        if (memo.visibility == "public") {
                            Icon(
                                Icons.Default.Public,
                                contentDescription = "public",
                                modifier = Modifier.size(16.dp)
                            )
                        } else {
                            Icon(
                                Icons.Default.RemoveRedEye,
                                contentDescription = "private",
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                    Text(
                        text = DateUtils.getRelativeTimeSpanString(
                            Instant.parse(memo.createdAt).toEpochMilli(),
                            System.currentTimeMillis(),
                            DateUtils.MINUTE_IN_MILLIS,
                            DateUtils.FORMAT_ABBREV_RELATIVE
                        ).toString(),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (!onlyShowContent) {
                    IconButton(onClick = { onClickReply(memo.id) }) {
                        Icon(
                            Icons.AutoMirrored.Filled.Comment,
                            contentDescription = "reply this memo",
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    IconButton(onClick = { expandedDropdownMenu = true }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "more actions")
                        DropdownMenu(
                            expanded = expandedDropdownMenu,
                            onDismissRequest = { expandedDropdownMenu = false }) {
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        "修改",
                                    )
                                }, onClick = {
                                    expandedDropdownMenu = false
                                    onClickEdit(memo.id)
                                },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.Edit,
                                        contentDescription = "edit",
                                    )
                                })

                            DropdownMenuItem(
                                text = {
                                    Text(
                                        "删除 memo",
                                        color = MaterialTheme.colorScheme.error
                                    )
                                }, onClick = {
                                    showDeleteDialog = true
                                    expandedDropdownMenu = false
                                },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.Delete,
                                        contentDescription = "delete",
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                })
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Markdown(
                memo.content.trimIndent(),
                imageTransformer = Coil2ImageTransformerImpl,
                components = markdownComponents(
                    codeBlock = highlightedCodeBlock,
                    codeFence = highlightedCodeFence,
                )
            )
            if (memo.resources.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    maxItemsInEachRow = 3
                ) {
                    memo.resources.forEach { resource ->
                        with(sharedTransitionScope) {
                            AsyncImage(
                                model = ImageRequest.Builder(LocalContext.current)
                                    .data(resource.externalLink)
                                    .diskCachePolicy(CachePolicy.DISABLED)
                                    .memoryCachePolicy(CachePolicy.ENABLED)
                                    .build(),
                                contentDescription = "Resource",
                                modifier = Modifier
                                    .size(100.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .clickable {
                                        onClickImage(resource.externalLink)
                                    }
                                    .sharedElement(
                                        sharedContentState = rememberSharedContentState(key = "${imageSharedContentKeyPrefix}-${resource.externalLink}"),
                                        animatedVisibilityScope = animatedVisibilityScope,
                                    ),
                                contentScale = ContentScale.Crop
                            )
                        }
                    }
                }

            }
            if (memo.quotedMemo != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .then(
                            if (onClickReferredMemo != null) {
                                Modifier.clickable { onClickReferredMemo(memo.quotedMemo.id) }
                            } else {
                                Modifier
                            }
                        ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = memo.quotedMemo.content,
                            style = MaterialTheme.typography.bodyMedium,
                            maxLines = 5,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                }
            }
            if (memo.replies.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Spacer(modifier = Modifier.weight(1f))
                    Text(
                        "查看 ${memo.replies.size} 条回复",
                        style = MaterialTheme.typography.labelMedium
                    )
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowRightAlt,
                        contentDescription = "reply",
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