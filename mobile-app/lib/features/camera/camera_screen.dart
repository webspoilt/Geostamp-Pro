import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:geocoding/geocoding.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/services/location_service.dart';
import '../../core/services/stamper_service.dart';
import '../../core/services/api_service.dart';

class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> with WidgetsBindingObserver {
  final ApiService _api = ApiService();
  final ImagePicker _picker = ImagePicker();

  List<CameraDescription> _availableCameras = [];
  CameraController? _cameraController;
  int _selectedCameraIndex = 0;
  bool _isCameraInitialized = false;
  FlashMode _flashMode = FlashMode.auto;

  double? _lat;
  double? _lng;
  String _coords = 'Acquiring GPS fix…';
  String _address = '';
  String _timestamp = '';
  bool _isCapturing = false;
  File? _lastCapturedFile;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initHardwareCamera();
    _refreshLocationAndTimestamp();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return;
    }
    if (state == AppLifecycleState.inactive) {
      _cameraController?.dispose();
    } else if (state == AppLifecycleState.resumed) {
      _initHardwareCamera();
    }
  }

  Future<void> _initHardwareCamera() async {
    try {
      _availableCameras = await availableCameras();
      if (_availableCameras.isNotEmpty) {
        await _setupCameraController(_availableCameras[_selectedCameraIndex]);
      }
    } catch (e) {
      debugPrint('Hardware camera init error (fallback available): $e');
    }
  }

  Future<void> _setupCameraController(CameraDescription description) async {
    await _cameraController?.dispose();
    _cameraController = CameraController(
      description,
      ResolutionPreset.max, // High quality native camera sensor resolution
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );

    try {
      await _cameraController!.initialize();
      await _cameraController!.setFlashMode(_flashMode);
      if (mounted) {
        setState(() => _isCameraInitialized = true);
      }
    } catch (e) {
      debugPrint('Camera controller init error: $e');
    }
  }

  Future<void> _switchCamera() async {
    if (_availableCameras.length < 2) return;
    _selectedCameraIndex = (_selectedCameraIndex + 1) % _availableCameras.length;
    await _setupCameraController(_availableCameras[_selectedCameraIndex]);
  }

  Future<void> _toggleFlash() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) return;
    FlashMode nextMode;
    switch (_flashMode) {
      case FlashMode.auto:
        nextMode = FlashMode.always;
        break;
      case FlashMode.always:
        nextMode = FlashMode.off;
        break;
      case FlashMode.off:
      default:
        nextMode = FlashMode.auto;
        break;
    }

    try {
      await _cameraController!.setFlashMode(nextMode);
      setState(() => _flashMode = nextMode);
    } catch (_) {}
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

  Future<void> _captureHighQualityPhoto() async {
    if (_lat == null || _lng == null) {
      await _refreshLocationAndTimestamp();
      if (_lat == null || _lng == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('⚠️ Acquiring GPS coordinates... please wait')),
          );
        }
        return;
      }
    }

    setState(() => _isCapturing = true);

    try {
      XFile? rawCapturedFile;

      // 1. Try real hardware camera with ResolutionPreset.max
      if (_cameraController != null && _cameraController!.value.isInitialized) {
        rawCapturedFile = await _cameraController!.takePicture();
      } else {
        // Fallback for emulator / system camera intent
        rawCapturedFile = await _picker.pickImage(
          source: ImageSource.camera,
          maxWidth: 4096, // Full high-resolution raw capture
          maxHeight: 4096,
          imageQuality: 100,
        );
      }

      if (rawCapturedFile == null) {
        setState(() => _isCapturing = false);
        return;
      }

      final rawFile = File(rawCapturedFile.path);

      // 2. On-device high-resolution stamping
      final stamped = await StamperService.stampImage(
        imageFile: rawFile,
        latitude: _lat!,
        longitude: _lng!,
        address: _address,
      );

      setState(() {
        _lastCapturedFile = stamped;
      });

      // 3. Cloud upload
      try {
        await _api.uploadImage(
          stamped.path,
          lat: _lat,
          lng: _lng,
          address: _address,
          capturedAt: DateTime.now(),
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('📸 High-quality GeoStamped photo captured & saved!')),
          );
        }
      } catch (uploadError) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Photo stamped on device. Cloud: $uploadError')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Capture error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isCapturing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black87,
        title: const Text('GeoStamp Camera Pro', style: TextStyle(fontSize: 16)),
        actions: [
          if (_cameraController != null && _cameraController!.value.isInitialized)
            IconButton(
              icon: Icon(
                _flashMode == FlashMode.always
                    ? Icons.flash_on
                    : _flashMode == FlashMode.auto
                        ? Icons.flash_auto
                        : Icons.flash_off,
                color: _flashMode != FlashMode.off ? const Color(0xFF00D4FF) : Colors.white60,
              ),
              onPressed: _toggleFlash,
            ),
          if (_availableCameras.length > 1)
            IconButton(
              icon: const Icon(Icons.flip_camera_ios, color: Colors.white),
              onPressed: _switchCamera,
            ),
          IconButton(
            icon: const Icon(Icons.photo_library, color: Color(0xFF00D4FF)),
            tooltip: 'Pick from Gallery to Stamp',
            onPressed: () => Navigator.pushNamed(context, '/editor'),
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            tooltip: 'Refresh GPS',
            onPressed: _refreshLocationAndTimestamp,
          ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Live Camera Preview or Stamped Photo Review
          if (_isCameraInitialized && _cameraController != null && _lastCapturedFile == null)
            Center(
              child: CameraPreview(_cameraController!),
            )
          else if (_lastCapturedFile != null)
            Image.file(_lastCapturedFile!, fit: BoxFit.cover)
          else
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.camera_alt, size: 70, color: Colors.white30),
                  const SizedBox(height: 12),
                  const Text(
                    'Direct Sensor Capture Ready',
                    style: TextStyle(color: Colors.white70, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Tap shutter to click high-resolution GPS photo',
                    style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                  ),
                ],
              ),
            ),

          // 2. Viewfinder Target Crosshairs Overlay
          Positioned.fill(
            child: IgnorePointer(
              child: Center(
                child: Container(
                  width: 220,
                  height: 220,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.white.withOpacity(0.2), width: 1.5),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Center(
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: const BoxDecoration(
                        color: Color(0xFF00D4FF),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),

          // 3. Live HUD Banner (GPS + Address + Timestamp)
          Positioned(
            top: 16,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.65),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.my_location, color: Color(0xFF00D4FF), size: 14),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          _coords,
                          style: const TextStyle(
                            color: Color(0xFF00D4FF),
                            fontFamily: 'monospace',
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00D4FF).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'RAW 4K',
                          style: TextStyle(color: Color(0xFF00D4FF), fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  if (_address.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(
                      _address,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white70, fontSize: 11),
                    ),
                  ],
                  const SizedBox(height: 2),
                  Text(
                    _timestamp,
                    style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 10),
                  ),
                ],
              ),
            ),
          ),

          // 4. Bottom Controls: Shutter button & review
          Positioned(
            bottom: 24,
            left: 0,
            right: 0,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_lastCapturedFile != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: TextButton.icon(
                      style: TextButton.styleFrom(
                        backgroundColor: Colors.black87,
                        foregroundColor: const Color(0xFF00D4FF),
                      ),
                      icon: const Icon(Icons.refresh, size: 18),
                      label: const Text('Back to Live Camera'),
                      onPressed: () => setState(() => _lastCapturedFile = null),
                    ),
                  ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    // Open Editor / Gallery
                    IconButton(
                      iconSize: 32,
                      icon: const Icon(Icons.photo_library, color: Colors.white),
                      onPressed: () => Navigator.pushNamed(context, '/editor'),
                    ),

                    // Shutter Click Button
                    _isCapturing
                        ? const SizedBox(
                            width: 74,
                            height: 74,
                            child: CircularProgressIndicator(color: Color(0xFF00D4FF), strokeWidth: 4),
                          )
                        : GestureDetector(
                            onTap: _captureHighQualityPhoto,
                            child: Container(
                              width: 76,
                              height: 76,
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 3.5),
                              ),
                              child: Container(
                                decoration: const BoxDecoration(
                                  color: Color(0xFF00D4FF),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.camera_alt, color: Colors.black, size: 34),
                              ),
                            ),
                          ),

                    // Gallery Tab
                    IconButton(
                      iconSize: 32,
                      icon: const Icon(Icons.grid_view, color: Colors.white),
                      onPressed: () => Navigator.pushReplacementNamed(context, '/gallery'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
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
