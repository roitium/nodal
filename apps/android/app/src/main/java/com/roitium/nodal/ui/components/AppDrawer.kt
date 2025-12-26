package com.roitium.nodal.ui.components

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.roitium.nodal.ui.navigation.Screen
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

@Composable
fun AppDrawerContent(
    drawerState: DrawerState,
    onLogout: () -> Unit,
    rememberCoroutineScope: CoroutineScope,
    rememberNavController: NavHostController
) {
    ModalDrawerSheet {
        Spacer(Modifier.height(12.dp))
        AppDrawerScreens(drawerState, rememberCoroutineScope, rememberNavController)
        NavigationDrawerItem(
            icon = { Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null) },
            label = { Text("Logout") },
            selected = false,
            onClick = onLogout,
            modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                    colors = NavigationDrawerItemDefaults.colors(
                    unselectedIconColor = MaterialTheme.colorScheme.error,
            unselectedTextColor = MaterialTheme.colorScheme.error
        )
        )
    }
}

@Composable
fun AppDrawerScreens(
    drawerState: DrawerState,
    scope: CoroutineScope,
    navController: NavHostController
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    Screen.drawerScreens.forEach { screen ->
        NavigationDrawerItem(
            label = { Text(screen.label) },
            icon = { Icon(screen.icon, contentDescription = null) },
            selected = currentRoute == screen.route, // 动态判断选中状态
            onClick = {
                navController.navigate(screen.route) {
                    // 避免在栈中堆积重复页面
                    popUpTo(navController.graph.findStartDestination().id) {
                        saveState = true
                    }
                    launchSingleTop = true
                    restoreState = true
                }
                scope.launch { drawerState.close() }
            },
            modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
        )
    }
}