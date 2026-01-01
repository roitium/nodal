package com.roitium.nodal.ui.screens.resource

import SnackbarManager
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage
import coil.request.CachePolicy
import coil.request.ImageRequest
import com.roitium.nodal.data.models.Resource

@Composable
fun ImageCard(
    onClickImage: (url: String?) -> Unit,
    resource: Resource,
    pushToMemoDetail: (id: String) -> Unit
) {
    var expandedDropdownMenu by remember { mutableStateOf(false) }
    Box(
        modifier = Modifier
            .aspectRatio(1f)
    ) {
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(resource.externalLink)
                .diskCachePolicy(CachePolicy.DISABLED)
                .memoryCachePolicy(CachePolicy.ENABLED)
                .build(),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .matchParentSize()
                .pointerInput(Unit) {
                    detectTapGestures(
                        onTap = {
                            onClickImage(resource.externalLink)
                        },
                        onLongPress = {
                            expandedDropdownMenu = true
                        }
                    )
                }
        )

        DropdownMenu(
            expanded = expandedDropdownMenu,
            onDismissRequest = { expandedDropdownMenu = false }
        ) {
            DropdownMenuItem(
                text = { Text("查看原 memo") },
                onClick = {
                    expandedDropdownMenu = false
                    if (resource.memoId == null) {
                        SnackbarManager.showMessage("该资源没有被 memo 引用")
                    } else {
                        pushToMemoDetail(resource.memoId)
                    }
                }
            )
        }
    }
}