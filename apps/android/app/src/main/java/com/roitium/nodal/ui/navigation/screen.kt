package com.roitium.nodal.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(
    val route: String,
    val label: String,
    val icon: ImageVector
) {
    object YourMemos : Screen("yourMemos", "Your Memos", Icons.AutoMirrored.Filled.List)
    object Publish : Screen("publish", "Publish", Icons.Default.Edit)
    object Register : Screen("register", "Register", Icons.Default.Person)
    object Login : Screen("login", "Login", Icons.Default.Person)
    object Explore : Screen("explore", "Explore", Icons.Default.Map)

    companion object {
        val drawerScreens = listOf(YourMemos, Explore)
    }
}