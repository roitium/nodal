package com.roitium.nodal.ui.screens.publish

import SnackbarManager
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Link
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import coil.compose.AsyncImage
import com.roitium.nodal.ui.components.MemoCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PublishScreen(
    viewModel: PublishViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    animatedVisibilityScope: AnimatedVisibilityScope,
    sharedTransitionScope: SharedTransitionScope,
) {
    val context = LocalContext.current
    var showExitDialog by remember { mutableStateOf(false) }
    val pickMedia =
        rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia()) { uris ->
            if (uris.isNotEmpty()) {
                val resources =
                    uris.map { uri -> ResourceUnify.Local(resource = ResourceUri(uri = uri)) }
                viewModel.onResourcesSelected(resources, context)
            }
        }
    val hasUnsavedChanges =
        viewModel.content.isNotBlank() || viewModel.resources.isNotEmpty()
    var showReferredMemoDialog by remember { mutableStateOf(false) }
    val scrollState = rememberScrollState()

    LaunchedEffect(true) {
        viewModel.uiEvent.collect { event ->
            when (event) {
                is PublishUiEvent.ShowMessage -> {
                    SnackbarManager.showMessage(event.message)
                }

                is PublishUiEvent.PublishSuccess -> {
                    SnackbarManager.showMessage(event.msg)
                    onNavigateBack()
                }

                is PublishUiEvent.UploadError -> {
                    SnackbarManager.showMessage("文件 ${event.fileName} 上传失败: ${event.error}")
                }

                is PublishUiEvent.NavigateBack -> {
                    onNavigateBack()
                }

                is PublishUiEvent.EditSuccess -> {
                    SnackbarManager.showMessage(event.msg)
                    onNavigateBack()
                }
            }
        }
    }

    BackHandler(
        enabled = hasUnsavedChanges,
        onBack = { showExitDialog = true }
    )
    if (showExitDialog) {
        AlertDialog(
            onDismissRequest = { showExitDialog = false },
            title = { Text("提示") },
            text = { Text("你有未保存的内容，确定要放弃修改并退出吗？") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showExitDialog = false
                        onNavigateBack()
                    }
                ) {
                    Text("走！", color = Color.Red)
                }
            },
            dismissButton = {
                TextButton(onClick = { showExitDialog = false }) {
                    Text("我再想想")
                }
            }
        )
    }
    with(sharedTransitionScope) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text(if (viewModel.realMemoId != null) "修改" else if (viewModel.realReplyToMemoId != null) "回复" else "发布") },
                    navigationIcon = {
                        IconButton(onClick = {
                            if (hasUnsavedChanges) {
                                showExitDialog = true
                            } else {
                                onNavigateBack()
                            }
                        }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    },
                    actions = {
                        Button(
                            onClick = { viewModel.publish() },
                            enabled = (viewModel.content.isNotBlank() || viewModel.resources.isNotEmpty()) && !viewModel.isPublishLoading,
                            modifier = Modifier
                                .windowInsetsPadding(WindowInsets.displayCutout)
                                .padding(end = 8.dp)
                        ) {
                            if (viewModel.isPublishLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(16.dp),
                                    color = MaterialTheme.colorScheme.onPrimary
                                )
                            } else {
                                Text(
                                    "提交"
                                )
                            }
                        }
                    }
                )
            },
            modifier = Modifier
                .sharedBounds(
                    sharedContentState = rememberSharedContentState(key = "click-fab"),
                    animatedVisibilityScope = animatedVisibilityScope,
                    resizeMode = SharedTransitionScope.ResizeMode.RemeasureToBounds
                )
                .sharedBounds(
                    sharedContentState = rememberSharedContentState(key = "click-comment"),
                    animatedVisibilityScope = animatedVisibilityScope,
                    resizeMode = SharedTransitionScope.ResizeMode.RemeasureToBounds
                )
        ) { paddingValues ->
            if (viewModel.isLoadingRawMemo || viewModel.isLoadingReplyMemo) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.3f)),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                Column(
                    modifier = Modifier
                        .padding(paddingValues)
                        .fillMaxSize()
                        .padding(16.dp)
                        .imePadding()
                        .verticalScroll(scrollState)
                ) {
                    if (viewModel.replyMemo != null) {
                        MemoCard(
                            memo = viewModel.replyMemo!!.copy(replies = emptyList()),
                            onClickImage = {}, onDelete = {
                            },
                            onClickEdit = {},
                            animatedVisibilityScope = animatedVisibilityScope,
                            sharedTransitionScope = sharedTransitionScope,
                            onClickReply = {},
                            onlyShowContent = true,
                            onClickMemo = null,
                            onClickReferredMemo = null,
                            imageSharedContentKeyPrefix = "do-not-use-it",
                            onClickAvatar = {}
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                    OutlinedTextField(
                        value = viewModel.content,
                        onValueChange = viewModel::onContentChanged,
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        placeholder = { Text("在想些什么？") },
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = MaterialTheme.colorScheme.surface,
                            unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                            disabledContainerColor = MaterialTheme.colorScheme.surface,
                        )
                    )

                    if (viewModel.resources.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        LazyRow(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(100.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(
                                viewModel.resources,
                                key = { item ->
                                    when (item) {
                                        is ResourceUnify.Local -> item.resource.uri.toString()
                                        is ResourceUnify.Remote -> item.resource.id
                                    }
                                }) { item ->
                                Box(modifier = Modifier.size(100.dp)) {
                                    AsyncImage(
                                        model = if (item is ResourceUnify.Local) item.resource.uri else if (item is ResourceUnify.Remote) item.resource.externalLink else null,
                                        contentDescription = null,
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Crop
                                    )
                                    if (item is ResourceUnify.Local && item.resource.isLoading) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.align(
                                                Alignment.Center
                                            )
                                        )
                                    }
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
                                                viewModel.onRemoveResource(item)
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
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                    if (viewModel.referredMemo != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        AssistChip(
                            onClick = { viewModel.deleteReferredMemo() },
                            label = {
                                Text(
                                    viewModel.referredMemo!!.content,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.Link,
                                    contentDescription = null,
                                    modifier = Modifier.size(AssistChipDefaults.IconSize)
                                )
                            }
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row {
                            IconButton(onClick = {
                                pickMedia.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo))
                            }) {
                                Icon(Icons.Default.Image, contentDescription = "Add Media")
                            }
                            IconButton(onClick = {
                                showReferredMemoDialog = true
                            }) {
                                Icon(Icons.Default.Link, contentDescription = "Refer Memo")
                            }
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = viewModel.isPrivate,
                                onCheckedChange = { viewModel.onIsPrivateChanged(it) }
                            )
                            Text("私密")
                        }
                    }
                    ReferMemoDialog(
                        showDialog = showReferredMemoDialog,
                        onDismiss = { showReferredMemoDialog = false },
                        onSetReferredMemo = { memoId ->
                            viewModel.updateReferredMemoId(memoId)
                            showReferredMemoDialog = false
                        }
                    )
                }
            }
        }
    }
}
