package com.roitium.nodal.ui.screens.memoDetail

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.roitium.nodal.ui.components.MemoCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MemoDetailScreen(
    onClickImage: (url: String?) -> Unit,
    viewModel: MemoDetailViewModel = viewModel(),
    onNavigateBack: () -> Unit,
    onClickReferredMemo: (id: String) -> Unit
) {
    val scrollState = rememberScrollState()

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
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .padding(paddingValues)
                .fillMaxSize()
        ) {
            if (viewModel.isLoading && viewModel.memo == null) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else if (viewModel.error != null && viewModel.memo == null) {
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(text = viewModel.error!!, color = MaterialTheme.colorScheme.error)
                    Button(onClick = {
                        viewModel.loadMemoDetail()
                    }) {
                        Text("重试")
                    }
                }
            } else if (viewModel.memo != null) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(scrollState)
                        .padding(horizontal = 8.dp)
                ) {
                    MemoCard(
                        memo = viewModel.memo!!,
                        onClickImage = onClickImage,
                        onDelete = {
                            viewModel.deleteMemo()
                            onNavigateBack()
                        },
                        containerColor = MaterialTheme.colorScheme.surface,
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                        onClickMemo = null,
                        onClickReferredMemo = onClickReferredMemo
                    )
                }
            }
        }
    }
}