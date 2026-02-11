import 'package:dio/dio.dart';
import '../constants/app_constants.dart';
import 'storage_service.dart';

class ApiService {
  late Dio _dio;
  String _baseUrl = AppConstants.defaultApiUrl;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: AppConstants.apiTimeout,
      receiveTimeout: AppConstants.apiTimeout,
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await StorageService.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
    ));
  }

  void setBaseUrl(String url) {
    _baseUrl = url;
    _dio.options.baseUrl = url;
  }

  // ---- Auth ----
  Future<Response> register(String name, String email, String password) =>
      _dio.post('/api/auth/register', data: {'name': name, 'email': email, 'password': password});

  Future<Response> login(String email, String password) =>
      _dio.post('/api/auth/login', data: {'email': email, 'password': password});

  Future<Response> getProfile() => _dio.get('/api/auth/profile');

  // ---- Images ----
  Future<Response> uploadImage(String filePath, {double? lat, double? lng, String? address}) async {
    final formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(filePath),
      if (lat != null) 'latitude': lat,
      if (lng != null) 'longitude': lng,
      if (address != null) 'address': address,
    });
    return _dio.post('/api/images', data: formData);
  }

  Future<Response> getImages({int page = 1, int limit = 20}) =>
      _dio.get('/api/images', queryParameters: {'page': page, 'limit': limit});

  Future<Response> deleteImage(String id) => _dio.delete('/api/images/$id');

  // ---- Locations ----
  Future<Response> getLocations() => _dio.get('/api/locations');

  Future<Response> createLocation(Map<String, dynamic> data) =>
      _dio.post('/api/locations', data: data);

  Future<Response> deleteLocation(String id) => _dio.delete('/api/locations/$id');
}
