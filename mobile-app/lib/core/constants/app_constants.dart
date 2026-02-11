class AppConstants {
  AppConstants._();

  static const String appName = 'GeoStamp Pro';
  static const String appVersion = '1.0.0';

  // API
  static const String defaultApiUrl = 'http://10.0.2.2:5000'; // Android emulator localhost
  static const Duration apiTimeout = Duration(seconds: 30);

  // Storage keys
  static const String tokenKey = 'auth_token';
  static const String userKey = 'user_data';
  static const String apiUrlKey = 'api_url';

  // Image
  static const int maxImageSize = 20 * 1024 * 1024; // 20 MB
  static const double defaultJpegQuality = 85;

  // GPS
  static const int locationTimeoutSeconds = 15;
  static const double locationAccuracyMeters = 50;
}
