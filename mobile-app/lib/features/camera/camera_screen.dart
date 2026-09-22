import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geocoding/geocoding.dart';
import '../../core/services/location_service.dart';
import '../../core/services/stamper_service.dart';
import '../../core/services/api_service.dart';

class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  final ImagePicker _picker = ImagePicker();
  final ApiService _api = ApiService();

  double? _lat;
  double? _lng;
  String _coords = 'Fetching GPS…';
  String _address = '';
  String _timestamp = '';
  bool _isProcessing = false;
  File? _lastStampedPhoto;

  @override
  void initState() {
    super.initState();
    _refreshLocationAndTimestamp();
  }

  Future<void> _refreshLocationAndTimestamp() async {
    final now = DateTime.now();
    setState(() {
      _timestamp =
          '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')} '
          '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}';
    });

    final position = await LocationService.getCurrentPosition();
    if (position != null && mounted) {
      setState(() {
        _lat = position.latitude;
        _lng = position.longitude;
        _coords = LocationService.formatCoordinates(
          position.latitude,
          position.longitude,
        );
      });

      // Reverse geocode to human-readable address
      try {
        final placemarks = await placemarkFromCoordinates(
          position.latitude,
          position.longitude,
        );
        if (placemarks.isNotEmpty && mounted) {
          final p = placemarks.first;
          setState(() {
            _address = [p.street, p.subLocality, p.locality, p.postalCode, p.country]
                .where((s) => s != null && s.isNotEmpty)
                .join(', ');
          });
        }
      } catch (_) {}
    }
  }

  Future<void> _captureAndStamp() async {
    if (_lat == null || _lng == null) {
      await _refreshLocationAndTimestamp();
      if (_lat == null || _lng == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('⚠️ Valid GPS location required before capturing')),
          );
        }
        return;
      }
    }

    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 90,
      );

      if (photo == null) return;

      setState(() => _isProcessing = true);

      // On-device pixel composition
      final stamped = await StamperService.stampImage(
        imageFile: File(photo.path),
        latitude: _lat!,
        longitude: _lng!,
        address: _address,
      );

      setState(() {
        _lastStampedPhoto = stamped;
      });

      // Auto-upload stamped photo to backend
      try {
        await _api.uploadImage(
          stamped.path,
          lat: _lat,
          lng: _lng,
          address: _address,
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('✅ GeoStamped photo captured and uploaded!')),
          );
        }
      } catch (err) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Photo stamped locally. Upload status: $err')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Capture failed: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('GeoStamp Camera'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshLocationAndTimestamp,
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: double.infinity,
                height: 380,
                margin: const EdgeInsets.symmetric(horizontal: 24),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: _lastStampedPhoto != null
                      ? Image.file(_lastStampedPhoto!, fit: BoxFit.cover)
                      : Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.camera_alt, size: 64, color: Colors.white.withOpacity(0.3)),
                              const SizedBox(height: 12),
                              Text(
                                'Tap shutter to capture & stamp',
                                style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 14),
                              ),
                            ],
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  children: [
                    Text('📍 $_coords', style: const TextStyle(color: Color(0xFF00D4FF), fontSize: 13, fontWeight: FontWeight.bold)),
                    if (_address.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text('🏠 $_address', textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
                    ],
                    const SizedBox(height: 4),
                    Text('🕒 $_timestamp', style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12)),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              _isProcessing
                  ? const CircularProgressIndicator(color: Color(0xFF00D4FF))
                  : FloatingActionButton.large(
                      onPressed: _captureAndStamp,
                      backgroundColor: const Color(0xFF00D4FF),
                      child: const Icon(Icons.camera, size: 36, color: Colors.white),
                    ),
              const SizedBox(height: 20),
            ],
          ),
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
