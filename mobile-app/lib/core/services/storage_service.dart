import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';

class StorageService {
  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  /// Store sensitive JWT auth token in hardware-backed KeyStore/KeyChain
  static Future<void> setToken(String token) async {
    try {
      await _secureStorage.write(key: AppConstants.tokenKey, value: token);
    } catch (e) {
      if (kDebugMode) {
        print('SecureStorage write error: $e. Falling back to SharedPreferences.');
      }
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(AppConstants.tokenKey, token);
    }
  }

  /// Retrieve sensitive JWT auth token
  static Future<String?> getToken() async {
    try {
      final token = await _secureStorage.read(key: AppConstants.tokenKey);
      if (token != null) return token;
    } catch (e) {
      if (kDebugMode) {
        print('SecureStorage read error: $e');
      }
    }
    // Fallback/migration check
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(AppConstants.tokenKey);
  }

  /// Wipe token on logout
  static Future<void> clearToken() async {
    try {
      await _secureStorage.delete(key: AppConstants.tokenKey);
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.tokenKey);
  }

  /// Non-sensitive config (like custom host URL) stays in SharedPreferences
  static Future<void> setApiUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.apiUrlKey, url);
  }

  static Future<String?> getApiUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(AppConstants.apiUrlKey);
  }
}
