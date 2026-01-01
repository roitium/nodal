package com.roitium.nodal.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Map
import androidx.compose.ui.graphics.vector.ImageVector

data class DrawerItem(
    val label: String,
    val icon: ImageVector,
    val route: String,
    val type: String? // 供 timeline 页面使用
)

val drawerScreens = listOf(
    DrawerItem(
        label = "探索",
        icon = Icons.Default.Map,
        route = NodalDestinations.buildTimelineRoute(TIMELINE_TYPE.GLOBAL),
        type = "global"
    ),
    DrawerItem(
        label = "我的",
        icon = Icons.AutoMirrored.Filled.List,
        route = NodalDestinations.buildTimelineRoute(TIMELINE_TYPE.PERSONAL),
        type = "personal"
    ),

    DrawerItem(
        label = "资源库",
        icon = Icons.Default.Map,
        route = NodalDestinations.RESOURCE_ROUTE,
        type = null
    )
)