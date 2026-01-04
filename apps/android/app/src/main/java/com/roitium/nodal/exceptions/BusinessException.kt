package com.roitium.nodal.exceptions

class BusinessException(val code: Int, override val message: String, traceId: String) :
    Exception("$code: $message(trace id: $traceId)")

class NotLoginException(override val message: String) : Exception(message)