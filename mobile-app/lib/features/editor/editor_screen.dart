import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/services/location_service.dart';
import '../../core/services/stamper_service.dart';
import '../../core/services/api_service.dart';
import '../../core/services/subscription_service.dart';
import '../../core/widgets/ad_banner_widget.dart';
import '../../core/widgets/premium_upgrade_dialog.dart';
import 'widgets/map_picker_sheet.dart';

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
  DateTime _selectedDateTime = DateTime.now();
  bool _isStamping = false;
  bool _isUploading = false;

  final TextEditingController _latController = TextEditingController(text: '37.7749');
  final TextEditingController _lngController = TextEditingController(text: '-122.4194');
  final TextEditingController _addressController = TextEditingController(text: 'San Francisco, CA, USA');

  @override
  void initState() {
    super.initState();
    _fetchCurrentLocationIfAvailable();
  }

  Future<void> _fetchCurrentLocationIfAvailable() async {
    final pos = await LocationService.getCurrentPosition();
    if (pos != null && mounted) {
      final addr = await LocationService.getAddressFromCoordinates(pos.latitude, pos.longitude);
      setState(() {
        _lat = pos.latitude;
        _lng = pos.longitude;
        _latController.text = pos.latitude.toStringAsFixed(6);
        _lngController.text = pos.longitude.toStringAsFixed(6);
        if (addr.isNotEmpty) {
          _address = addr;
          _addressController.text = addr;
        }
      });
    }
  }

  bool _isGalleryImage = false;

  Future<void> _pickImageFromGallery() async {
    final sub = Provider.of<SubscriptionService>(context, listen: false);
    if (!sub.canEditFromGallery()) {
      await PremiumUpgradeDialog.show(context);
      return;
    }

    final picked = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 2048,
      maxHeight: 2048,
      imageQuality: 92,
    );
    if (picked != null) {
      setState(() {
        _selectedFile = File(picked.path);
        _stampedFile = null;
        _isGalleryImage = true;
      });
    }
  }

  Future<void> _pickImageFromCamera() async {
    final picked = await _picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 2048,
      maxHeight: 2048,
      imageQuality: 92,
    );
    if (picked != null) {
      setState(() {
        _selectedFile = File(picked.path);
        _stampedFile = null;
        _isGalleryImage = false;
      });
    }
  }

  Future<void> _openMapPicker() async {
    final currentLat = double.tryParse(_latController.text) ?? _lat;
    final currentLng = double.tryParse(_lngController.text) ?? _lng;

    final result = await showModalBottomSheet<LocationResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => MapPickerSheet(
        initialLat: currentLat,
        initialLng: currentLng,
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _lat = result.latitude;
        _lng = result.longitude;
        _address = result.address;
        _latController.text = result.latitude.toStringAsFixed(6);
        _lngController.text = result.longitude.toStringAsFixed(6);
        _addressController.text = result.address;
      });
    }
  }

  Future<void> _pickCustomDate() async {
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: _selectedDateTime,
      firstDate: DateTime(1970),
      lastDate: DateTime(2100),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF00D4FF),
              onPrimary: Colors.black,
              surface: Color(0xFF1E293B),
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (pickedDate != null && mounted) {
      setState(() {
        _selectedDateTime = DateTime(
          pickedDate.year,
          pickedDate.month,
          pickedDate.day,
          _selectedDateTime.hour,
          _selectedDateTime.minute,
          _selectedDateTime.second,
        );
      });
    }
  }

  Future<void> _pickCustomTime() async {
    final pickedTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_selectedDateTime),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF00D4FF),
              onPrimary: Colors.black,
              surface: Color(0xFF1E293B),
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (pickedTime != null && mounted) {
      setState(() {
        _selectedDateTime = DateTime(
          _selectedDateTime.year,
          _selectedDateTime.month,
          _selectedDateTime.day,
          pickedTime.hour,
          pickedTime.minute,
          0,
        );
      });
    }
  }

  Future<void> _applyStamp() async {
    if (_selectedFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an image first')),
      );
      return;
    }

    final sub = Provider.of<SubscriptionService>(context, listen: false);
    if (_isGalleryImage && !sub.canEditFromGallery()) {
      await PremiumUpgradeDialog.show(context);
      return;
    }

    final lat = double.tryParse(_latController.text);
    final lng = double.tryParse(_lngController.text);

    if (lat == null || lng == null || lat.abs() > 90 || lng.abs() > 180 || (lat == 0 && lng == 0)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('⚠️ Please specify valid GPS coordinates (not 0, 0)')),
      );
      return;
    }

    setState(() => _isStamping = true);

    try {
      final stamped = await StamperService.stampImage(
        imageFile: _selectedFile!,
        latitude: lat,
        longitude: lng,
        address: _addressController.text,
        timestamp: _selectedDateTime,
      );

      setState(() {
        _stampedFile = stamped;
      });

      // Record edit quota if image was loaded from gallery
      if (_isGalleryImage) {
        await sub.recordGalleryEdit();
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Stamp applied with custom date & map location!')),
        );

        // Show interstitial ad for free users
        InterstitialAdDialog.show(context, onDismiss: () {});
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

    final lat = double.tryParse(_latController.text) ?? _lat;
    final lng = double.tryParse(_lngController.text) ?? _lng;

    setState(() => _isUploading = true);

    try {
      await _api.uploadImage(
        fileToUpload.path,
        lat: lat,
        lng: lng,
        address: _addressController.text,
        capturedAt: _selectedDateTime,
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
    } finally {
      if (mounted) {
        setState(() => _isUploading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final sub = Provider.of<SubscriptionService>(context);
    final formattedDate = DateFormat('yyyy-MM-dd').format(_selectedDateTime);
    final formattedTime = DateFormat('HH:mm:ss').format(_selectedDateTime);

    return Scaffold(
      appBar: AppBar(
        title: const Text('GeoStamp Editor & Gallery'),
        actions: [
          if (!sub.isPremium)
            TextButton.icon(
              style: TextButton.styleFrom(
                foregroundColor: Colors.amber,
              ),
              icon: const Icon(Icons.workspace_premium, size: 16),
              label: const Text('PRO ₹99', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              onPressed: () => PremiumUpgradeDialog.show(context),
            ),
          IconButton(
            icon: const Icon(Icons.add_a_photo),
            tooltip: 'Take Photo',
            onPressed: _pickImageFromCamera,
          ),
          IconButton(
            icon: const Icon(Icons.photo_library),
            tooltip: 'Pick from Gallery',
            onPressed: _pickImageFromGallery,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Quota Bar / Pro Status Bar
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: sub.isPremium ? Colors.amber.withOpacity(0.12) : const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: sub.isPremium ? Colors.amber.withOpacity(0.4) : Colors.white12,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    sub.isPremium ? Icons.workspace_premium : Icons.lock_clock,
                    color: sub.isPremium ? Colors.amber : const Color(0xFF00D4FF),
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      sub.isPremium
                          ? '⭐ PRO Member · Unlimited Gallery Edits'
                          : 'Gallery Limit: ${sub.remainingFreeEdits()} free edit remaining today',
                      style: TextStyle(
                        color: sub.isPremium ? Colors.amber : Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  if (!sub.isPremium)
                    GestureDetector(
                      onTap: () => PremiumUpgradeDialog.show(context),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00D4FF),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          '₹99/mo',
                          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 11),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Image Preview Container
            GestureDetector(
              onTap: _pickImageFromGallery,
              child: Container(
                width: double.infinity,
                height: 290,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.12)),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: (_stampedFile ?? _selectedFile) != null
                      ? Stack(
                          fit: StackFit.expand,
                          children: [
                            Image.file(
                              _stampedFile ?? _selectedFile!,
                              fit: BoxFit.contain,
                            ),
                            Positioned(
                              top: 8,
                              right: 8,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.black87,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  _stampedFile != null ? '✅ STAMPED' : 'ORIGINAL (Tap to change)',
                                  style: TextStyle(
                                    color: _stampedFile != null ? const Color(0xFF00D4FF) : Colors.white70,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        )
                      : Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.photo_library, size: 54, color: Color(0xFF00D4FF)),
                              const SizedBox(height: 10),
                              const Text(
                                'Select Photo from Gallery or Camera',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Add any date, time & map location stamp',
                                style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // In-App Ad Banner for free users
            const AdBannerWidget(
              title: '⭐ Pro GPS & Geocaching Gear',
              subtitle: 'Precision measuring tools & laser levels up to 35% off.',
            ),
            const SizedBox(height: 12),

            // Date & Time Picker Section
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.04),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.event, color: Color(0xFF00D4FF), size: 18),
                      const SizedBox(width: 8),
                      const Text(
                        'Stamp Date & Time',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const Spacer(),
                      TextButton.icon(
                        icon: const Icon(Icons.restore, size: 16),
                        label: const Text('Now', style: TextStyle(fontSize: 12)),
                        onPressed: () => setState(() => _selectedDateTime = DateTime.now()),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.calendar_today, size: 16),
                          label: Text(formattedDate),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Colors.white24),
                          ),
                          onPressed: _pickCustomDate,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.access_time, size: 16),
                          label: Text(formattedTime),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Colors.white24),
                          ),
                          onPressed: _pickCustomTime,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Map Location Picker Section
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.04),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.map, color: Color(0xFF00D4FF), size: 18),
                      const SizedBox(width: 8),
                      const Text(
                        'Location & Coordinates',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const Spacer(),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.place, size: 16),
                        label: const Text('Pick on Map', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00D4FF),
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        ),
                        onPressed: _openMapPicker,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _latController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: const InputDecoration(
                            labelText: 'Latitude',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _lngController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: const InputDecoration(
                            labelText: 'Longitude',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
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
                      isDense: true,
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.my_location),
                        tooltip: 'Current GPS',
                        onPressed: _fetchCurrentLocationIfAvailable,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _selectedFile == null || _isStamping ? null : _applyStamp,
                    icon: const Icon(Icons.brush),
                    label: Text(_isStamping ? 'Stamping…' : 'Apply GeoStamp'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00D4FF),
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                  ),
                ),
                if (_stampedFile != null) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _isUploading ? null : _uploadStamped,
                      icon: _isUploading
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF00D4FF)),
                            )
                          : const Icon(Icons.cloud_upload),
                      label: Text(_isUploading ? 'Uploading…' : 'Save Cloud'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF00D4FF),
                        side: const BorderSide(color: Color(0xFF00D4FF)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 20),
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
