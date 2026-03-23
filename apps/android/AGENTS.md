# ANDROID APP KNOWLEDGE BASE

**App:** Android Native  
**Stack:** Kotlin + Jetpack Compose + Room  
**Architecture:** Clean Architecture + MVVM

---

## OVERVIEW

Offline-first Android app with encrypted auth, Room database, and Retrofit API client. Features sync status tracking and shared element transitions.

---

## STRUCTURE

```
app/src/main/java/com/roitium/nodal/
├── MainActivity.kt          # Single activity entry
├── Application.kt           # Hilt application
├── MainViewModel.kt         # Global ViewModel
├── CompositionLocals.kt     # LocalSnackbarHostState
├── data/
│   ├── api/                 # Retrofit interfaces
│   │   ├── memo.kt
│   │   ├── auth.kt
│   │   └── resource.kt
│   ├── local/               # Room database
│   │   ├── AppDatabase.kt
│   │   ├── MemoEntity.kt
│   │   ├── MemoDao.kt
│   │   ├── RemoteCursorDao.kt
│   │   └── Mapper.kt
│   ├── models/              # API models
│   │   └── models.kt
│   └── repository/          # Repositories
│       ├── MemoRepository.kt
│       ├── AuthRepository.kt
│       └── ResourceRepository.kt
├── di/
│   ├── AppModule.kt         # Hilt providers
│   └── ApiModule.kt         # Retrofit config
├── ui/
│   ├── navigation/          # Navigation setup
│   │   ├── NodalDestinations.kt
│   │   └── DrawerMenu.kt
│   ├── screens/             # Feature screens
│   │   ├── timeline/
│   │   ├── search/
│   │   ├── publish/
│   │   ├── memoDetail/
│   │   ├── login/
│   │   ├── register/
│   │   ├── resource/
│   │   └── imageViewer/
│   ├── components/          # Reusable UI
│   │   ├── MemoCard.kt
│   │   └── AppDrawer.kt
│   └── theme/               # Material3 theming
│       ├── Theme.kt
│       ├── Color.kt
│       └── Type.kt
├── utils/
│   ├── AuthTokenManager.kt  # Encrypted token storage
│   ├── CryptoManager.kt     # Android Keystore/Tink
│   ├── SnackbarManager.kt   # Flow-based snackbar
│   └── DateUtils.kt
└── exceptions/
    └── BusinessException.kt
```

---

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add screen | `ui/screens/*/` | Feature folders |
| UI component | `ui/components/` | MemoCard, AppDrawer |
| Repository | `data/repository/` | Data layer |
| Database | `data/local/` | Room entities/DAOs |
| API call | `data/api/` | Retrofit interfaces |
| DI module | `di/` | Hilt modules |
| Theme | `ui/theme/` | Material3 colors |
| Navigation | `ui/navigation/` | Destinations |
| Encrypted prefs | `utils/AuthTokenManager.kt` | Keystore + Tink |

---

## SCREENS

| Screen | Path | Description |
|--------|------|-------------|
| Timeline | `ui/screens/timeline/` | Main feed |
| Search | `ui/screens/search/` | Global search |
| Publish | `ui/screens/publish/` | Create memo |
| MemoDetail | `ui/screens/memoDetail/` | View/reply |
| Login | `ui/screens/login/` | Auth |
| Register | `ui/screens/register/` | Sign up |
| Resource | `ui/screens/resource/` | File uploads |
| ImageViewer | `ui/screens/imageViewer/` | Fullscreen images |

---

## CONVENTIONS

### Repository Pattern
```kotlin
class MemoRepository @Inject constructor(
    private val api: MemoApi,
    private val dao: MemoDao,
    @ApplicationScope private val scope: CoroutineScope
) {
    fun getTimeline(): Flow<List<MemoEntity>> = 
        dao.getAll().onEach { syncIfNeeded() }
}
```

### Offline-First Sync
```kotlin
// MemoEntity has SyncStatus
enum class SyncStatus { SYNCED, PENDING_CREATE, PENDING_UPDATE, PENDING_DELETE }

// DAO "smart" operations handle status
@Insert(onConflict = OnConflictStrategy.REPLACE)
suspend fun smartUpdate(memo: MemoEntity)
```

### Navigation
```kotlin
// NodalDestinations.kt
object Timeline : Screen("timeline")
object MemoDetail : Screen("memo/{id}")

// Usage
navController.navigate(Timeline.route)
```

### Encrypted Storage
```kotlin
// AuthTokenManager with Tink
suspend fun saveToken(token: String)
suspend fun getToken(): String?
suspend fun clearToken()
```

### Shared Element Transitions
```kotlin
// Use sharedTransitionScope from parent
with(sharedTransitionScope) {
    AsyncImage(
        modifier = Modifier.sharedElement(...)
    )
}
```

---

## ANTI-PATTERNS

| Rule | Location | Issue |
|------|----------|-------|
| REPLACE conflict on sync | `MemoDao.kt:81` | FIXME: local PENDING_UPDATE overwritten by API |

---

## COMMANDS

```bash
# Open in Android Studio
open -a "Android Studio" apps/android

# Or use Gradle
./gradlew assembleDebug
./gradlew installDebug
```

---

## NOTES

- **Architecture**: Clean Architecture + MVVM + Repository pattern
- **DI**: Hilt (Dagger) with `@AndroidEntryPoint`, `@HiltViewModel`
- **Database**: Room with Flow queries
- **Network**: Retrofit + Kotlinx Serialization
- **Images**: Coil for image loading
- **Auth**: Encrypted DataStore with Android Keystore (Tink)
- **Sync**: Offline-first with `SyncStatus` tracking
- **Pagination**: Cursor-based with `RemoteCursorEntity`
- **UI**: Jetpack Compose with Material3
- **Navigation**: Compose Navigation with shared element transitions
- **Snackbar**: Flow-based `SnackbarManager` singleton
