import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/services/auth_service.dart';
import 'core/services/api_service.dart';
import 'features/auth/login_screen.dart';
import 'features/camera/camera_screen.dart';
import 'features/gallery/gallery_screen.dart';
import 'features/editor/editor_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const GeoStampApp());
}

class GeoStampApp extends StatelessWidget {
  const GeoStampApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
        Provider(create: (_) => ApiService()),
      ],
      child: MaterialApp(
        title: 'GeoStamp Pro',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        initialRoute: '/login',
        routes: {
          '/login': (context) => const LoginScreen(),
          '/camera': (context) => const CameraScreen(),
          '/gallery': (context) => const GalleryScreen(),
          '/editor': (context) => const EditorScreen(),
        },
      ),
    );
  }
}
