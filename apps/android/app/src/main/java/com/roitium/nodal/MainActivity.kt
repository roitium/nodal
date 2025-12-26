package com.roitium.nodal

import com.roitium.nodal.ui.navigation.Screen
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.roitium.nodal.data.NodalRepository
import com.roitium.nodal.ui.components.AppDrawerContent
import com.roitium.nodal.ui.screens.login.LoginScreen
import com.roitium.nodal.ui.screens.publish.PublishScreen
import com.roitium.nodal.ui.screens.register.RegisterScreen
import com.roitium.nodal.ui.screens.yourMemos.YourMemosScreen
import com.roitium.nodal.ui.theme.NodalTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        NodalRepository.initialize(this)
        enableEdgeToEdge()
        setContent {
            NodalTheme {
                NodalApp()
            }
        }
    }
}

@Composable
fun NodalApp() {
    val navController = rememberNavController()
    val startDestination = if (NodalRepository.isLoggedIn()) "yourMemos" else "login"
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    var showLogoutDialog by remember { mutableStateOf(false) }
    
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val gesturesEnabled = currentRoute == "yourMemos"

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("确认退出") },
            text = { Text("你确定要退出当前账号吗？未保存的内容可能会丢失。") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        scope.launch {
                            drawerState.close()
                            NodalRepository.logout()
                            navController.navigate("login") {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                    }
                ) {
                    Text("退出", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("取消")
                }
            }
        )
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = gesturesEnabled,
        drawerContent = {
            AppDrawerContent(
                drawerState = drawerState,
                onLogout = {
                    showLogoutDialog = true
                }
                ,
                rememberCoroutineScope = scope,
                rememberNavController = navController
            )
        }
    ) {
        NavHost(navController = navController, startDestination = startDestination) {
            composable(Screen.Login.route) {
                LoginScreen(
                    onNavigateToRegister = { navController.navigate(Screen.Login.route) },
                    onLoginSuccess = {
                        navController.navigate(Screen.YourMemos.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                )
            }
            composable(Screen.Register.route) {
                RegisterScreen(
                    onNavigateToLogin = { navController.popBackStack() },
                    onRegisterSuccess = {
                        navController.navigate(Screen.YourMemos.route) {
                            popUpTo(Screen.Register.route) { inclusive = true }
                        }
                    }
                )
            }
            composable("yourMemos") {
                YourMemosScreen(
                    onNavigateToPublish = { navController.navigate(Screen.Publish.route) },
                    onOpenDrawer = {
                        scope.launch { drawerState.open() }
                    }
                )
            }
            composable("publish") {
                PublishScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
}
