package com.roitium.nodal.ui.components

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material3.DrawerState
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.roitium.nodal.ui.navigation.NodalDestinations
import com.roitium.nodal.ui.navigation.drawerScreens
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
    val currentTypeArg = navBackStackEntry?.arguments?.getString(NodalDestinations.Args.TYPE)

    drawerScreens.forEach { screen ->
        val selected = if (currentRoute == NodalDestinations.TIMELINE_ROUTE) {
            currentTypeArg == screen.type
        } else {
            currentRoute == screen.route
        }
        NavigationDrawerItem(
            label = { Text(screen.label) },
            icon = { Icon(screen.icon, contentDescription = null) },
            selected = selected,
            onClick = {
                navController.navigate(screen.route) {
                    popUpTo(navController.graph.findStartDestination().id) {
                        saveState = true
                    }
                    launchSingleTop = true
                    restoreState = false
                }
                scope.launch { drawerState.close() }
            },
            modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
        )
    }
}