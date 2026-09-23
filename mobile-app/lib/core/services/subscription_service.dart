import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

class SubscriptionService extends ChangeNotifier {
  static const String _premiumKey = 'is_premium_member';
  static const String _lastEditDateKey = 'gallery_edit_last_date';
  static const String _dailyEditCountKey = 'gallery_edit_daily_count';

  bool _isPremium = false;
  int _todayEditsCount = 0;

  bool get isPremium => _isPremium;
  int get todayEditsCount => _todayEditsCount;
  int get freeDailyLimit => 1;

  SubscriptionService() {
    _loadStatus();
  }

  Future<void> _loadStatus() async {
    final prefs = await SharedPreferences.getInstance();
    _isPremium = prefs.getBool(_premiumKey) ?? false;

    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final lastDate = prefs.getString(_lastEditDateKey) ?? '';

    if (lastDate != today) {
      _todayEditsCount = 0;
      await prefs.setString(_lastEditDateKey, today);
      await prefs.setInt(_dailyEditCountKey, 0);
    } else {
      _todayEditsCount = prefs.getInt(_dailyEditCountKey) ?? 0;
    }

    notifyListeners();
  }

  bool canEditFromGallery() {
    if (_isPremium) return true;
    return _todayEditsCount < freeDailyLimit;
  }

  int remainingFreeEdits() {
    if (_isPremium) return 999;
    final remaining = freeDailyLimit - _todayEditsCount;
    return remaining > 0 ? remaining : 0;
  }

  Future<bool> recordGalleryEdit() async {
    if (!canEditFromGallery()) return false;

    if (!_isPremium) {
      _todayEditsCount++;
      final prefs = await SharedPreferences.getInstance();
      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      await prefs.setString(_lastEditDateKey, today);
      await prefs.setInt(_dailyEditCountKey, _todayEditsCount);
      notifyListeners();
    }
    return true;
  }

  Future<void> upgradeToPremium() async {
    _isPremium = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_premiumKey, true);
    notifyListeners();
  }

  Future<void> cancelPremium() async {
    _isPremium = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_premiumKey, false);
    notifyListeners();
  }
}
