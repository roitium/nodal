import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.receiveAsFlow

data class SnackbarMessage(
    val message: String,
    val actionLabel: String? = null,
    val onAction: (() -> Unit)? = null
)

object SnackbarManager {
    private val _messages = Channel<SnackbarMessage>(Channel.UNLIMITED)

    val messages = _messages.receiveAsFlow()

    fun showMessage(message: String, actionLabel: String? = null, onAction: (() -> Unit)? = null) {
        _messages.trySend(SnackbarMessage(message, actionLabel, onAction))
    }
}