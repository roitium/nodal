package com.roitium.nodal.ui.screens.timeline

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.roitium.nodal.ui.components.MemoCard
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimelineScreen(
    viewModel: TimelineViewModel = viewModel(),
    onNavigateToPublish: () -> Unit,
    onOpenDrawer: () -> Unit,
    onClickImage: (url: String?) -> Unit,
    onNavigateToMemoDetail: (memoId: String) -> Unit
) {
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    val shouldLoadMore by remember {
        derivedStateOf {
            val totalItems = listState.layoutInfo.totalItemsCount
            val lastVisibleItemIndex =
                listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            totalItems > 0 && lastVisibleItemIndex >= totalItems - 3 && viewModel.nextCursor != null
        }
    }

    LaunchedEffect(shouldLoadMore) {
        // 从其他页面返回时，虽然 ViewModel 还存在，但是 Screen 会 recomposition，也会导致该 effect 重新运行。所以我们还需要判断一下 shouldLoadMore 具体的值
        if (!shouldLoadMore) return@LaunchedEffect
        viewModel.loadMemos(false)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(viewModel.appBarTitle) },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "菜单")
                    }
                },
                modifier = Modifier
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onDoubleTap = {
                                coroutineScope.launch {
                                    listState.animateScrollToItem(0)
                                }
                            },
                        )
                    }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onNavigateToPublish) {
                Icon(Icons.Default.Add, contentDescription = "发布")
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .padding(paddingValues)
                .fillMaxSize()
        ) {
            if (viewModel.isLoading && viewModel.memos.isEmpty()) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else if (viewModel.error != null && viewModel.memos.isEmpty()) {
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(text = viewModel.error!!, color = MaterialTheme.colorScheme.error)
                    Button(onClick = {
                        viewModel.loadMemos(true)
                    }) {
                        Text("重试")
                    }
                }
            } else {
                PullToRefreshBox(
                    isRefreshing = viewModel.isLoading,
                    onRefresh = {
                        viewModel.loadMemos(true)
                    }
                ) {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        items(viewModel.memos, key = { memo -> memo.id }) { memo ->
                            MemoCard(
                                memo, onClickImage = onClickImage, onDelete = { id ->
                                    viewModel.deleteMemo(id)
                                }, onClickMemo = onNavigateToMemoDetail,
                                onClickReferredMemo = onNavigateToMemoDetail
                            )
                        }
                        if (viewModel.isLoading && viewModel.memos.isNotEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                                }
                            }
                        }
                        if (viewModel.memos.isNotEmpty() && !viewModel.isLoading && viewModel.nextCursor == null) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        "已经到底了哦～",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.outline
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