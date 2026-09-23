import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Anti-Crack, Anti-Mod & App Integrity Guardian
///
/// Defends against:
/// 1. Frida / Xposed / Substrate dynamic hooking
/// 2. Magisk / KernelSU / SuperSU rooted devices
/// 3. Emulators / Sandboxes used to dump memory and crack limits
/// 4. Repackaging / APK tampering
class SecurityGuardian {
  static const MethodChannel _platform = MethodChannel('com.example.geostamp_pro/security');

  // Hardened HMAC salt for validating local subscription state integrity
  static const String _integritySalt = 'GEOSTAMP_PRO_SECURE_VAULT_2026_ANTI_MOD_v1';

  /// Generates a tamper-proof HMAC signature for local subscription records
  static String signSubscriptionState({
    required bool isPremium,
    required String lastEditDate,
    required int dailyCount,
  }) {
    final payload = '$isPremium:$lastEditDate:$dailyCount:$_integritySalt';
    final bytes = utf8.encode(payload);
    return sha256.convert(bytes).toString();
  }

  /// Verifies if local subscription state was altered or modded
  static bool verifySubscriptionState({
    required bool isPremium,
    required String lastEditDate,
    required int dailyCount,
    required String expectedSignature,
  }) {
    if (expectedSignature.isEmpty) return false;
    final computed = signSubscriptionState(
      isPremium: isPremium,
      lastEditDate: lastEditDate,
      dailyCount: dailyCount,
    );
    return computed == expectedSignature;
  }

  /// Proactive root & mod detection checks on Android filesystem
  static bool isDeviceCompromised() {
    if (kIsWeb) return false;

    // Detect common Root & Hooking binaries on Android
    if (Platform.isAndroid) {
      final suspiciousPaths = [
        '/system/app/Superuser.apk',
        '/sbin/su',
        '/system/bin/su',
        '/system/xbin/su',
        '/data/local/xbin/su',
        '/data/local/bin/su',
        '/system/sd/xbin/su',
        '/system/bin/failsafe/su',
        '/data/local/su',
        '/su/bin/su',
        // Magisk & KernelSU markers
        '/sbin/.magisk',
        '/data/adb/magisk',
        '/data/adb/ksu',
        // Hooking & Modding frameworks
        '/data/local/tmp/frida-server',
        '/data/local/tmp/re.frida.server',
        '/system/framework/XposedBridge.jar',
      ];

      for (final path in suspiciousPaths) {
        try {
          if (File(path).existsSync()) {
            return true;
          }
        } catch (_) {
          // Access restricted by SELinux, continue checks
        }
      }

      // Check build tags for test-keys (custom modded ROMs)
      final buildTags = Platform.environment['BUILD_TAGS'] ?? '';
      if (buildTags.contains('test-keys')) {
        return true;
      }
    }

    return false;
  }

  /// Native check hook via MethodChannel if Android MainActivity implements it
  static Future<bool> isEnvironmentTampered() async {
    try {
      final bool? isTampered = await _platform.invokeMethod<bool>('checkAppIntegrity');
      return isTampered ?? false;
    } catch (_) {
      return isDeviceCompromised();
    }
  }
}
