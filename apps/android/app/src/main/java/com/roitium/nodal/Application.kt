package com.roitium.nodal

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class NodalApplication : Application() {
    override fun onCreate() {
        super.onCreate()
    }
}