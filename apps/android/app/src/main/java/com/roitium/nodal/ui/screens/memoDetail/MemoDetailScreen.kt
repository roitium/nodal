package com.roitium.nodal.ui.screens.memoDetail

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.roitium.nodal.ui.components.MemoCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MemoDetailScreen(
    onClickImage: (url: String?) -> Unit,
    viewModel: MemoDetailViewModel = viewModel(),
    onNavigateBack: () -> Unit,
    onNavigateToMemoDetail: (id: String) -> Unit,
    onNavigateToPublish: (memoId: String?, replyToMemoId: String?) -> Unit,
    onNavigateToTimeline: (username: String) -> Unit,
    animatedVisibilityScope: AnimatedVisibilityScope,
    sharedTransitionScope: SharedTransitionScope,
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    with(sharedTransitionScope) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("详情") },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                )
            },
            modifier = Modifier.sharedBounds(
                sharedContentState = rememberSharedContentState(key = "click-comment"),
                animatedVisibilityScope = animatedVisibilityScope,
                resizeMode = SharedTransitionScope.ResizeMode.RemeasureToBounds
            )
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .padding(paddingValues)
                    .fillMaxSize()
            ) {
                when (uiState) {
                    is MemoDetailUiState.Loading -> {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                    }

                    is MemoDetailUiState.Error -> {
                        Column(
                            modifier = Modifier.align(Alignment.Center),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = (uiState as MemoDetailUiState.Error).message,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                    }

                    is MemoDetailUiState.Success -> {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 8.dp)
                        ) {
                            item {
                                with(sharedTransitionScope) {
                                    MemoCard(
                                        // 这里我们直接把 replies 列表覆盖为空，避免显示 tip
                                        memo = (uiState as MemoDetailUiState.Success).memo.copy(
                                            replies = emptyList()
                                        ),
                                        onClickImage = onClickImage,
                                        onDelete = {
                                            viewModel.deleteMemo({
                                                onNavigateBack()
                                            })
                                        },
                                        containerColor = MaterialTheme.colorScheme.surface,
                                        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                                        onClickMemo = null,
                                        onClickReferredMemo = onNavigateToMemoDetail,
                                        onClickEdit = { id ->
                                            onNavigateToPublish(id, null)
                                        },
                                        animatedVisibilityScope = animatedVisibilityScope,
                                        sharedTransitionScope = sharedTransitionScope,
                                        onClickReply = { id ->
                                            onNavigateToPublish(null, id)
                                        },
                                        containerModifier = Modifier.sharedBounds(
                                            sharedContentState = rememberSharedContentState(
                                                key = "memo-card-${(uiState as MemoDetailUiState.Success).memo.id}"
                                            ),
                                            animatedVisibilityScope = animatedVisibilityScope,
                                            resizeMode = SharedTransitionScope.ResizeMode.RemeasureToBounds
                                        ),
                                        imageSharedContentKeyPrefix = "detail-page-image",
                                        onClickAvatar = onNavigateToTimeline
                                    )
                                }
                            }
                            if ((uiState as MemoDetailUiState.Success).memo.replies.isNotEmpty()) {
                                item {
                                    Spacer(modifier = Modifier.height(16.dp))
                                    HorizontalDivider()
                                    Spacer(modifier = Modifier.height(16.dp))
                                }
                                itemsIndexed(
                                    items = (uiState as MemoDetailUiState.Success).memo.replies,
                                    key = { index, item -> item.id }) { index, item ->
                                    with(sharedTransitionScope) {
                                        MemoCard(
                                            item, onClickImage = onClickImage,
                                            onDelete = { id ->
                                                viewModel.deleteMemo {
                                                }
                                            },
                                            onClickMemo = onNavigateToMemoDetail,
                                            onClickReferredMemo = onNavigateToMemoDetail,
                                            onClickEdit = { id ->
                                                onNavigateToPublish(id, null)
                                            },
                                            animatedVisibilityScope = animatedVisibilityScope,
                                            sharedTransitionScope = sharedTransitionScope,
                                            onClickReply = { id ->
                                                onNavigateToPublish(null, id)
                                            },
                                            containerColor = MaterialTheme.colorScheme.surface,
                                            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                                            containerModifier = Modifier.sharedBounds(
                                                sharedContentState = rememberSharedContentState(
                                                    key = "memo-card-${item.id}"
                                                ),
                                                animatedVisibilityScope = animatedVisibilityScope,
                                                resizeMode = SharedTransitionScope.ResizeMode.RemeasureToBounds
                                            ),
                                            imageSharedContentKeyPrefix = "detail-page-image",
                                            onClickAvatar = onNavigateToTimeline
                                        )
                                    }
                                    if (index < (uiState as MemoDetailUiState.Success).memo.replies.lastIndex) {
                                        HorizontalDivider(
                                            modifier = Modifier.padding(horizontal = 16.dp)
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