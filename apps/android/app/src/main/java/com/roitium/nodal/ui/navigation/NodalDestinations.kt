package com.roitium.nodal.ui.navigation

import java.net.URLEncoder
import java.nio.charset.StandardCharsets

enum class TIMELINE_TYPE {
    GLOBAL,
    PERSONAL
}

object NodalDestinations {
    const val TIMELINE_ROUTE = "timeline?type={type}&username={username}"
    const val IMAGE_VIEWER_ROUTE = "image_viewer/{url}"
    const val PUBLISH_ROUTE = "publish?replyToMemoId={replyToMemoId}&memoId={memoId}"
    const val LOGIN_ROUTE = "login"
    const val REGISTER_ROUTE = "register"
    const val RESOURCE_ROUTE = "resource"
    const val MEMO_DETAIL_ROUTE = "memo_detail/{memoId}"

    object Args {
        const val TYPE = "type"
        const val USERNAME = "username"
        const val URL = "url"
        const val MEMO_ID = "memoId"
        const val REPLY_TO_MEMO_ID = "replyToMemoId"
    }

    /**
     * 生成时间线的跳转链接
     * @param type "global" 或 "personal"
     * @param username 可选，如果查看他人主页则传入
     */
    fun buildTimelineRoute(type: TIMELINE_TYPE, username: String? = null): String {
        return when (type) {
            TIMELINE_TYPE.GLOBAL ->
                "timeline?type=global"

            TIMELINE_TYPE.PERSONAL ->
                if (username != null) {
                    "timeline?type=personal&username=$username"
                } else {
                    "timeline?type=personal"
                }
        }
    }

    /**
     * 生成图片查看器的跳转链接
     */
    fun buildImageViewerRoute(url: String): String {
        val encodedUrl = URLEncoder.encode(url, StandardCharsets.UTF_8.toString())
        return "image_viewer/$encodedUrl"
    }

    fun buildMemoDetailRoute(id: String): String {
        return "memo_detail/$id"
    }

    fun buildPublishRoute(replyToMemoId: String? = null, memoId: String? = null): String {
        return "publish?replyToMemoId=$replyToMemoId&memoId=$memoId"
    }
}