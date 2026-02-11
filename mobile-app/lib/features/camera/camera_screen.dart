import 'package:flutter/material.dart';
import '../../core/services/location_service.dart';

class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  String _coords = 'Fetching GPS…';
  String _timestamp = '';

  @override
  void initState() {
    super.initState();
    _updateLocation();
    _updateTimestamp();
  }

  Future<void> _updateLocation() async {
    final position = await LocationService.getCurrentPosition();
    if (position != null && mounted) {
      setState(() {
        _coords = LocationService.formatCoordinates(
          position.latitude,
          position.longitude,
        );
      });
    }
  }

  void _updateTimestamp() {
    final now = DateTime.now();
    setState(() {
      _timestamp =
          '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')} '
          '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Camera')),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: double.infinity,
              height: 400,
              margin: const EdgeInsets.symmetric(horizontal: 24),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.camera_alt, size: 64, color: Colors.white.withOpacity(0.3)),
                    const SizedBox(height: 12),
                    Text(
                      'Camera Preview',
                      style: TextStyle(color: Colors.white.withOpacity(0.5)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Integrate CameraPreview widget here',
                      style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text('📍 $_coords', style: const TextStyle(color: Color(0xFF00D4FF), fontSize: 14)),
            const SizedBox(height: 4),
            Text('🕒 $_timestamp', style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 13)),
            const SizedBox(height: 32),
            FloatingActionButton.large(
              onPressed: () {
                _updateTimestamp();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('📸 Photo captured! (placeholder)')),
                );
              },
              backgroundColor: const Color(0xFF00D4FF),
              child: const Icon(Icons.camera, size: 36, color: Colors.white),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: const Color(0xFF0A0E17),
        selectedItemColor: const Color(0xFF00D4FF),
        unselectedItemColor: Colors.white54,
        currentIndex: 0,
        onTap: (i) {
          if (i == 1) Navigator.pushReplacementNamed(context, '/gallery');
          if (i == 2) Navigator.pushReplacementNamed(context, '/editor');
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.camera_alt), label: 'Camera'),
          BottomNavigationBarItem(icon: Icon(Icons.photo_library), label: 'Gallery'),
          BottomNavigationBarItem(icon: Icon(Icons.edit), label: 'Editor'),
        ],
      ),
    );
  }
}
