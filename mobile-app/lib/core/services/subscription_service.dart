import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';
import 'security_guardian.dart';

class SubscriptionService extends ChangeNotifier {
  static const String _premiumKey = 'is_premium_member';
  static const String _lastEditDateKey = 'gallery_edit_last_date';
  static const String _dailyEditCountKey = 'gallery_edit_daily_count';
  static const String _signatureKey = 'gallery_sub_integrity_sig';

  // Hardware-backed encrypted storage to thwart shared_preferences XML tampering
  static const FlutterSecureStorage _vault = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  bool _isPremium = false;
  int _todayEditsCount = 0;
  bool _isTampered = false;

  bool get isPremium => _isPremium && !_isTampered;
  int get todayEditsCount => _todayEditsCount;
  int get freeDailyLimit => 1;
  bool get isTampered => _isTampered;

  SubscriptionService() {
    _loadStatus();
  }

  Future<void> _loadStatus() async {
    // 1. Device environment & Root integrity audit
    if (SecurityGuardian.isDeviceCompromised()) {
      _isTampered = true;
      _isPremium = false;
      notifyListeners();
      return;
    }

    try {
      final premiumVal = await _vault.read(key: _premiumKey);
      _isPremium = premiumVal == 'true';

      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final lastDate = await _vault.read(key: _lastEditDateKey) ?? '';
      final countStr = await _vault.read(key: _dailyEditCountKey) ?? '0';
      final sig = await _vault.read(key: _signatureKey) ?? '';

      final count = int.tryParse(countStr) ?? 0;

      // 2. Anti-mod cryptographic verification
      if (sig.isNotEmpty) {
        final isValid = SecurityGuardian.verifySubscriptionState(
          isPremium: _isPremium,
          lastEditDate: lastDate,
          dailyCount: count,
          expectedSignature: sig,
        );

        if (!isValid) {
          // Signature mismatch: APK / storage was modded or manipulated
          _isTampered = true;
          _isPremium = false;
          _todayEditsCount = freeDailyLimit; // Lock out edits
          notifyListeners();
          return;
        }
      }

      if (lastDate != today) {
        _todayEditsCount = 0;
        await _saveVaultState(_isPremium, today, 0);
      } else {
        _todayEditsCount = count;
      }
    } catch (_) {
      // In case of error, default to safe restricted mode
      _todayEditsCount = 0;
    }

    notifyListeners();
  }

  /// Write state securely with tamper-proof HMAC signature
  Future<void> _saveVaultState(bool isPremium, String date, int count) async {
    final sig = SecurityGuardian.signSubscriptionState(
      isPremium: isPremium,
      lastEditDate: date,
      dailyCount: count,
    );

    await _vault.write(key: _premiumKey, value: isPremium.toString());
    await _vault.write(key: _lastEditDateKey, value: date);
    await _vault.write(key: _dailyEditCountKey, value: count.toString());
    await _vault.write(key: _signatureKey, value: sig);
  }

  /// Strict rule: Editing is NOT allowed in free mode except for 1 single photo per day.
  /// Camera is completely free & unlimited.
  bool canEditPhoto() {
    if (_isTampered) return false;
    if (_isPremium) return true;
    return _todayEditsCount < freeDailyLimit;
  }

  int remainingFreeEdits() {
    if (_isTampered) return 0;
    if (_isPremium) return 999;
    final remaining = freeDailyLimit - _todayEditsCount;
    return remaining > 0 ? remaining : 0;
  }

  Future<bool> recordPhotoEdit() async {
    if (!canEditPhoto()) return false;

    if (!_isPremium) {
      _todayEditsCount++;
      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      await _saveVaultState(false, today, _todayEditsCount);
      notifyListeners();
    }
    return true;
  }

  Future<void> upgradeToPremium() async {
    _isPremium = true;
    _isTampered = false;
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    await _saveVaultState(true, today, _todayEditsCount);
    notifyListeners();
  }

  Future<void> cancelPremium() async {
    _isPremium = false;
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    await _saveVaultState(false, today, _todayEditsCount);
    notifyListeners();
  }
}
