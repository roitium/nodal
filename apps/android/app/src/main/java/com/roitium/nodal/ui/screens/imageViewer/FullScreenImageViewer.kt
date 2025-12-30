package com.roitium.nodal.ui.screens.imageViewer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import me.saket.telephoto.zoomable.coil.ZoomableAsyncImage
import me.saket.telephoto.zoomable.rememberZoomableImageState

@Composable
fun FullScreenImageViewer(imageUrl: String, onDismiss: () -> Unit) {
    val state = rememberZoomableImageState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        ZoomableAsyncImage(
            model = imageUrl,
            contentDescription = "Image Viewer",
            state = state,
            onClick = { onDismiss() },
            modifier = Modifier.fillMaxSize()
        )
    }
}