import 'package:flutter/material.dart';
import '../constants/app_constants.dart';
import 'api_service.dart';
import 'storage_service.dart';

class AuthService extends ChangeNotifier {
  final ApiService _api = ApiService();
  Map<String, dynamic>? _user;
  bool _loading = false;

  Map<String, dynamic>? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get loading => _loading;

  Future<void> init() async {
    final token = await StorageService.getToken();
    if (token != null) {
      try {
        final res = await _api.getProfile();
        _user = res.data['user'];
      } catch (_) {
        await StorageService.clearToken();
      }
    }
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    _loading = true;
    notifyListeners();
    try {
      final res = await _api.login(email, password);
      await StorageService.setToken(res.data['token']);
      _user = res.data['user'];
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> register(String name, String email, String password) async {
    _loading = true;
    notifyListeners();
    try {
      final res = await _api.register(name, email, password);
      await StorageService.setToken(res.data['token']);
      _user = res.data['user'];
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await StorageService.clearToken();
    _user = null;
    notifyListeners();
  }
}
