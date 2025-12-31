package com.roitium.nodal

import SnackbarManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.roitium.nodal.data.AuthState
import com.roitium.nodal.data.NodalRepository
import com.roitium.nodal.ui.components.AppDrawerContent
import com.roitium.nodal.ui.navigation.NodalDestinations
import com.roitium.nodal.ui.navigation.TIMELINE_TYPE
import com.roitium.nodal.ui.screens.imageViewer.FullScreenImageViewer
import com.roitium.nodal.ui.screens.login.LoginScreen
import com.roitium.nodal.ui.screens.memoDetail.MemoDetailScreen
import com.roitium.nodal.ui.screens.publish.PublishScreen
import com.roitium.nodal.ui.screens.register.RegisterScreen
import com.roitium.nodal.ui.screens.resource.ResourceScreen
import com.roitium.nodal.ui.screens.timeline.TimelineScreen
import com.roitium.nodal.ui.theme.NodalTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()

        splashScreen.setKeepOnScreenCondition {
            NodalRepository.authState.value is AuthState.Initializing
        }
        NodalRepository.initialize(this, applicationScope)
        super.onCreate(savedInstanceState)
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
    val authState by NodalRepository.authState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    if (authState is AuthState.Initializing) {
        return
    }

    val startDestination = if (authState is AuthState.Authenticated) {
        NodalDestinations.buildTimelineRoute(TIMELINE_TYPE.GLOBAL)
    } else {
        NodalDestinations.LOGIN_ROUTE
    }
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    var showLogoutDialog by remember { mutableStateOf(false) }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val gesturesEnabled =
        currentRoute == NodalDestinations.TIMELINE_ROUTE

    LaunchedEffect(Unit) {
        SnackbarManager.messages.collect { msg ->
            val result = snackbarHostState.showSnackbar(
                message = msg.message,
                actionLabel = msg.actionLabel,
                duration = SnackbarDuration.Short
            )

            if (result == SnackbarResult.ActionPerformed) {
                msg.onAction?.invoke()
            }
        }
    }

    CompositionLocalProvider(LocalSnackbarHostState provides snackbarHostState) {
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

        Scaffold(
            snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        ) {
            ModalNavigationDrawer(
                drawerState = drawerState,
                gesturesEnabled = gesturesEnabled,
                drawerContent = {
                    AppDrawerContent(
                        drawerState = drawerState,
                        onLogout = {
                            showLogoutDialog = true
                        },
                        rememberCoroutineScope = scope,
                        rememberNavController = navController
                    )
                }
            ) {
                SharedTransitionLayout {
                    NavHost(navController = navController, startDestination = startDestination) {
                        composable(NodalDestinations.LOGIN_ROUTE) {
                            LoginScreen(
                                onNavigateToRegister = { navController.navigate(NodalDestinations.REGISTER_ROUTE) },
                                onLoginSuccess = {
                                    navController.navigate(
                                        NodalDestinations.buildTimelineRoute(
                                            TIMELINE_TYPE.GLOBAL
                                        )
                                    ) {
                                        popUpTo(NodalDestinations.LOGIN_ROUTE) { inclusive = true }
                                    }
                                }
                            )
                        }
                        composable(NodalDestinations.REGISTER_ROUTE) {
                            RegisterScreen(
                                onNavigateToLogin = { navController.popBackStack() },
                                onRegisterSuccess = {
                                    navController.navigate(
                                        NodalDestinations.buildTimelineRoute(
                                            TIMELINE_TYPE.GLOBAL
                                        )
                                    ) {
                                        popUpTo(NodalDestinations.LOGIN_ROUTE) { inclusive = true }
                                    }
                                }
                            )
                        }
                        composable(
                            route = NodalDestinations.TIMELINE_ROUTE,
                            arguments = listOf(
                                navArgument(NodalDestinations.Args.TYPE) {},
                                navArgument(NodalDestinations.Args.USERNAME) {
                                    nullable = true; defaultValue = null
                                }
                            )
                        ) {
                            TimelineScreen(
                                onNavigateToPublish = { navController.navigate(NodalDestinations.PUBLISH_ROUTE) },
                                onOpenDrawer = {
                                    scope.launch { drawerState.open() }
                                },
                                onClickImage = { url ->
                                    val destination =
                                        NodalDestinations.buildImageViewerRoute(url.toString())
                                    navController.navigate(destination)
                                },
                                onNavigateToMemoDetail = {
                                    val destination =
                                        NodalDestinations.buildMemoDetailRoute(it)
                                    navController.navigate(destination)
                                }
                            )
                        }
                        composable(NodalDestinations.PUBLISH_ROUTE) {
                            PublishScreen(
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }
                        composable(
                            route = NodalDestinations.IMAGE_VIEWER_ROUTE,
                            arguments = listOf(navArgument(NodalDestinations.Args.URL) {
                                type = NavType.StringType
                            })
                        ) { backStackEntry ->
                            val url = backStackEntry.arguments?.getString("url") ?: ""

                            FullScreenImageViewer(
                                imageUrl = url,
                                onDismiss = { navController.popBackStack() }
                            )
                        }
                        composable(
                            route = NodalDestinations.RESOURCE_ROUTE
                        ) {
                            ResourceScreen(
                                onOpenDrawer = {
                                    scope.launch { drawerState.open() }
                                },
                                onClickImage = { url ->
                                    val destination =
                                        NodalDestinations.buildImageViewerRoute(url.toString())
                                    navController.navigate(destination)
                                },
                                onPushToMemoDetail = {
                                    val destination =
                                        NodalDestinations.buildMemoDetailRoute(it)
                                    navController.navigate(destination)
                                }
                            )
                        }
                        composable(
                            route = NodalDestinations.MEMO_DETAIL_ROUTE,
                            arguments = listOf(navArgument(NodalDestinations.Args.MEMO_ID) {
                                type = NavType.StringType
                            })
                        ) {
                            MemoDetailScreen(
                                onClickImage = { url ->
                                    val destination =
                                        NodalDestinations.buildImageViewerRoute(url.toString())
                                    navController.navigate(destination)
                                },
                                onNavigateBack = { navController.popBackStack() },
                                onClickReferredMemo = {
                                    val destination =
                                        NodalDestinations.buildMemoDetailRoute(it)
                                    navController.navigate(destination)
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}