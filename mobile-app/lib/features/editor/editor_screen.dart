import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/services/location_service.dart';
import '../../core/services/stamper_service.dart';
import '../../core/services/api_service.dart';

class EditorScreen extends StatefulWidget {
  const EditorScreen({super.key});

  @override
  State<EditorScreen> createState() => _EditorScreenState();
}

class _EditorScreenState extends State<EditorScreen> {
  final ImagePicker _picker = ImagePicker();
  final ApiService _api = ApiService();

  File? _selectedFile;
  File? _stampedFile;
  double _lat = 37.7749;
  double _lng = -122.4194;
  String _address = 'San Francisco, CA, USA';
  bool _isStamping = false;

  final TextEditingController _latController = TextEditingController(text: '37.7749');
  final TextEditingController _lngController = TextEditingController(text: '-122.4194');
  final TextEditingController _addressController = TextEditingController(text: 'San Francisco, CA');

  Future<void> _pickImage() async {
    final picked = await _picker.pickImage(source: ImageSource.gallery);
    if (picked != null) {
      setState(() {
        _selectedFile = File(picked.path);
        _stampedFile = null;
      });
    }
  }

  Future<void> _useCurrentLocation() async {
    final pos = await LocationService.getCurrentPosition();
    if (pos != null && mounted) {
      setState(() {
        _lat = pos.latitude;
        _lng = pos.longitude;
        _latController.text = pos.latitude.toStringAsFixed(6);
        _lngController.text = pos.longitude.toStringAsFixed(6);
      });
    }
  }

  Future<void> _applyStamp() async {
    if (_selectedFile == null) return;
    setState(() => _isStamping = true);

    try {
      final stamped = await StamperService.stampImage(
        imageFile: _selectedFile!,
        latitude: double.tryParse(_latController.text) ?? _lat,
        longitude: double.tryParse(_lngController.text) ?? _lng,
        address: _addressController.text,
      );

      setState(() {
        _stampedFile = stamped;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Stamp applied successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Stamping failed: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isStamping = false);
      }
    }
  }

  Future<void> _uploadStamped() async {
    final fileToUpload = _stampedFile ?? _selectedFile;
    if (fileToUpload == null) return;

    try {
      await _api.uploadImage(
        fileToUpload.path,
        lat: double.tryParse(_latController.text) ?? _lat,
        lng: double.tryParse(_lngController.text) ?? _lng,
        address: _addressController.text,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('☁️ Photo uploaded to your cloud gallery!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('GeoStamp Editor')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            GestureDetector(
              onTap: _pickImage,
              child: Container(
                width: double.infinity,
                height: 280,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: (_stampedFile ?? _selectedFile) != null
                      ? Image.file(
                          _stampedFile ?? _selectedFile!,
                          fit: BoxFit.contain,
                        )
                      : Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.add_photo_alternate, size: 54, color: Colors.white.withOpacity(0.3)),
                              const SizedBox(height: 8),
                              Text(
                                'Tap to choose photo from gallery',
                                style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _latController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Latitude', border: OutlineInputBorder()),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _lngController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Longitude', border: OutlineInputBorder()),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _addressController,
              decoration: InputDecoration(
                labelText: 'Address / Label',
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.my_location),
                  tooltip: 'Use current GPS location',
                  onPressed: _useCurrentLocation,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _selectedFile == null || _isStamping ? null : _applyStamp,
                    icon: const Icon(Icons.brush),
                    label: Text(_isStamping ? 'Stamping…' : 'Apply Stamp'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00D4FF),
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                if (_stampedFile != null) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _uploadStamped,
                      icon: const Icon(Icons.cloud_upload),
                      label: const Text('Save Cloud'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF00D4FF),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: const Color(0xFF0A0E17),
        selectedItemColor: const Color(0xFF00D4FF),
        unselectedItemColor: Colors.white54,
        currentIndex: 2,
        onTap: (i) {
          if (i == 0) Navigator.pushReplacementNamed(context, '/camera');
          if (i == 1) Navigator.pushReplacementNamed(context, '/gallery');
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
