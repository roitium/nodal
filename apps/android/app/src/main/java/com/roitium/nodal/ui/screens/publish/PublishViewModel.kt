package com.roitium.nodal.ui.screens.publish

import SnackbarManager
import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.roitium.nodal.data.models.Memo
import com.roitium.nodal.data.models.PatchQuoteMemoField
import com.roitium.nodal.data.models.Resource
import com.roitium.nodal.data.repository.MemoRepository
import com.roitium.nodal.data.repository.ResourceRepository
import com.roitium.nodal.ui.navigation.NodalDestinations
import dagger.hilt.android.lifecycle.HiltViewModel
import jakarta.inject.Inject
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch

data class ResourceUri(
    val uri: Uri,
    val isLoading: Boolean = true,
    val isFailure: Boolean = false
)

/**
 * 统一的 resource 类型
 */
sealed interface ResourceUnify {
    data class Remote(val resource: Resource) : ResourceUnify
    data class Local(val resource: ResourceUri) : ResourceUnify
}

sealed interface PublishUiEvent {
    data class ShowMessage(val message: String) : PublishUiEvent
    data class PublishSuccess(val msg: String = "发布成功") : PublishUiEvent
    data class UploadError(val fileName: String, val error: String) : PublishUiEvent
    data object NavigateBack : PublishUiEvent
    data class EditSuccess(val msg: String = "编辑成功") : PublishUiEvent
}

@HiltViewModel
class PublishViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val memoRepository: MemoRepository,
    private val resourceRepository: ResourceRepository
) : ViewModel() {
    var content by mutableStateOf("")
    var isPrivate by mutableStateOf(false)
    var resources = mutableStateListOf<ResourceUnify>()
        private set

    // 点击发布按钮时的加载状态
    var isPublishLoading by mutableStateOf(false)
        private set

    var isLoadingRawMemo by mutableStateOf(false)
        private set

    var isLoadingReplyMemo by mutableStateOf(false)
        private set
    var referredMemo by mutableStateOf<Memo?>(null)
        private set
    var replyMemo by mutableStateOf<Memo?>(null)
        private set

    private val _uiEvent = Channel<PublishUiEvent>()
    val uiEvent = _uiEvent.receiveAsFlow()

    private val memoId: String? = savedStateHandle[NodalDestinations.Args.MEMO_ID]

    // wtf is this???? memoId 如果为空，会是一个 "null" 字符串？？？
    val realMemoId = if (memoId == "null") null else memoId
    private val replyToMemoId: String? = savedStateHandle[NodalDestinations.Args.REPLY_TO_MEMO_ID]
    val realReplyToMemoId = if (replyToMemoId == "null") null else replyToMemoId

    init {
        if (realMemoId != null) {
            loadMemoForEdit(realMemoId)
        }
        if (realReplyToMemoId != null) {
            loadMemoForReply(realReplyToMemoId)
        }
    }

    private fun loadMemoForReply(id: String) {
        viewModelScope.launch {
            isLoadingReplyMemo = true
            try {
                val memo = memoRepository.getMemoDetail(id).first()
                replyMemo = memo
            } catch (e: Exception) {
                _uiEvent.send(PublishUiEvent.ShowMessage("加载回复的帖子: ${e.message}"))
                _uiEvent.send(PublishUiEvent.NavigateBack)
            } finally {
                isLoadingReplyMemo = false
            }
        }
    }

    private fun loadMemoForEdit(id: String) {
        viewModelScope.launch {
            isLoadingRawMemo = true
            try {
                val memo = memoRepository.getMemoDetail(id).first()

                content = memo.content
                isPrivate = memo.visibility == "private"
                referredMemo = memo.quotedMemo

                val existingResources = memo.resources.map { resource ->
                    ResourceUnify.Remote(resource)
                }
                resources.clear()
                resources.addAll(existingResources)
            } catch (e: Exception) {
                _uiEvent.send(PublishUiEvent.ShowMessage("加载原贴失败: ${e.message}"))
                _uiEvent.send(PublishUiEvent.NavigateBack)
            } finally {
                isLoadingRawMemo = false
            }
        }
    }

    fun updateReferredMemoId(memo: Memo) {
        referredMemo = memo
    }

    fun deleteReferredMemo() {
        referredMemo = null
    }

    fun onContentChanged(newContent: String) {
        content = newContent
    }

    fun onIsPrivateChanged(newIsPrivate: Boolean) {
        isPrivate = newIsPrivate
    }

    fun onResourcesSelected(items: List<ResourceUnify>, context: Context) {
        resources.addAll(items)

        val localItems = items.filterIsInstance<ResourceUnify.Local>()

        if (localItems.isEmpty()) return

        viewModelScope.launch {
            try {
                localItems.map { item ->
                    async {
                        try {
                            val resource = resourceRepository
                                .uploadFile(context, item.resource.uri)
                            val index = resources.indexOf(item)
                            if (index != -1) {
                                resources[index] = ResourceUnify.Remote(resource)
                            }
                        } catch (e: Exception) {
                            val newItem = ResourceUnify.Local(
                                item.resource.copy(
                                    isFailure = true,
                                    isLoading = false
                                )
                            )
                            resources[resources.indexOf(item)] = newItem
                            _uiEvent.send(
                                PublishUiEvent.UploadError(
                                    item.resource.uri.lastPathSegment ?: "Unknown",
                                    e.message ?: "Unknown"
                                )
                            )
                        }
                    }
                }.awaitAll()

            } catch (e: Exception) {
                _uiEvent.send(PublishUiEvent.ShowMessage(e.message ?: "Unknown"))
            }
        }
    }

    fun onRemoveResource(item: ResourceUnify) {
        resources.remove(item)
    }

    fun publish() {
        if (isPublishLoading) return
        val hasPendingUploads = resources.any { it is ResourceUnify.Local }
        // 最终应该确保所有的 resource 都转换成 remoteResource
        if (hasPendingUploads) {
            viewModelScope.launch {
                _uiEvent.send(PublishUiEvent.ShowMessage("请等待上传完成"))
            }
            return
        }
        if (content.isBlank()) {
            SnackbarManager.showMessage("内容不能为空")
            return
        }

        val resourceIds = resources.mapNotNull { (it as? ResourceUnify.Remote)?.resource?.id }
        val resourceObjects = resources.mapNotNull { (it as? ResourceUnify.Remote)?.resource }

        if (realMemoId != null) {
            viewModelScope.launch {
                isPublishLoading = true
                try {
                    val finalReferredMemo =
                        if (referredMemo == null) PatchQuoteMemoField.Empty else PatchQuoteMemoField.Exist(
                            referredMemo!!
                        )
                    memoRepository.patchMemo(
                        id = realMemoId,
                        content = content,
                        visibility = if (isPrivate) "private" else "public",
                        resources = resourceObjects,
                        quoteMemo = finalReferredMemo,
                        createdAt = null,
                        isPinned = null
                    )
                    _uiEvent.send(PublishUiEvent.EditSuccess())
                } catch (e: Exception) {
                    _uiEvent.send(PublishUiEvent.ShowMessage(e.message ?: "Unknown"))
                } finally {
                    isPublishLoading = false
                }
            }
        } else {
            viewModelScope.launch {
                isPublishLoading = true
                try {
                    memoRepository.publish(
                        content = content,
                        visibility = if (isPrivate) "private" else "public",
                        resources = resourceIds,
                        referredMemoId = referredMemo?.id,
                        replyMemo = replyMemo
                    )
                    _uiEvent.send(PublishUiEvent.PublishSuccess())
                } catch (e: Exception) {
                    _uiEvent.send(PublishUiEvent.ShowMessage(e.message ?: "Unknown"))
                } finally {
                    isPublishLoading = false
                }
            }
        }
    }
}
