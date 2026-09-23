package com.example.geostamp_pro

import android.os.Build
import android.os.Debug
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.example.geostamp_pro/security"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "checkAppIntegrity" -> {
                    val isTampered = checkIsDeviceTampered()
                    result.success(isTampered)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun checkIsDeviceTampered(): Boolean {
        // 1. Anti-Debugging Check (detect ptrace / debugger attachment)
        if (Debug.isDebuggerConnected() || Debug.waitingForDebugger()) {
            return true
        }

        // 2. Check for Test-Keys build
        val buildTags = Build.TAGS
        if (buildTags != null && buildTags.contains("test-keys")) {
            return true
        }

        // 3. Superuser / Su binary detection
        val suPaths = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/su/bin/su",
            "/sbin/.magisk",
            "/data/adb/magisk",
            "/data/adb/ksu"
        )

        for (path in suPaths) {
            if (File(path).exists()) {
                return true
            }
        }

        // 4. Frida / Dynamic Hooking Server detection in memory / filesystem
        val fridaPaths = arrayOf(
            "/data/local/tmp/frida-server",
            "/data/local/tmp/re.frida.server"
        )
        for (fPath in fridaPaths) {
            if (File(fPath).exists()) {
                return true
            }
        }

        return false
    }
}
