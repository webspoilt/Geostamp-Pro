import 'dart:math';
import 'package:flutter/material.dart';
import '../../core/services/location_service.dart';

class LocationResult {
  final double latitude;
  final double longitude;
  final String address;

  LocationResult({
    required this.latitude,
    required this.longitude,
    required this.address,
  });
}

class MapPickerSheet extends StatefulWidget {
  final double initialLat;
  final double initialLng;

  const MapPickerSheet({
    super.key,
    required this.initialLat,
    required this.initialLng,
  });

  @override
  State<MapPickerSheet> createState() => _MapPickerSheetState();
}

class _MapPickerSheetState extends State<MapPickerSheet> {
  late double _currentLat;
  late double _currentLng;
  double _zoom = 13.0;
  String _address = 'Resolving address…';
  bool _loadingAddress = false;

  final TextEditingController _searchController = TextEditingController();

  final List<Map<String, dynamic>> _quickLocations = [
    {'name': 'Current Device GPS', 'lat': 0.0, 'lng': 0.0, 'isCurrent': true},
    {'name': 'New York City, USA', 'lat': 40.7128, 'lng': -74.0060},
    {'name': 'London, UK', 'lat': 51.5074, 'lng': -0.1278},
    {'name': 'Tokyo, Japan', 'lat': 35.6762, 'lng': 139.6503},
    {'name': 'Paris, France', 'lat': 48.8566, 'lng': 2.3522},
    {'name': 'Sydney, Australia', 'lat': -33.8688, 'lng': 151.2093},
    {'name': 'Dubai, UAE', 'lat': 25.2048, 'lng': 55.2708},
    {'name': 'Singapore', 'lat': 1.3521, 'lng': 103.8198},
    {'name': 'San Francisco, USA', 'lat': 37.7749, 'lng': -122.4194},
    {'name': 'New Delhi, India', 'lat': 28.6139, 'lng': 77.2090},
  ];

  @override
  void initState() {
    super.initState();
    _currentLat = widget.initialLat;
    _currentLng = widget.initialLng;
    _resolveAddress(_currentLat, _currentLng);
  }

  Future<void> _resolveAddress(double lat, double lng) async {
    setState(() => _loadingAddress = true);
    final addr = await LocationService.getAddressFromCoordinates(lat, lng);
    if (mounted) {
      setState(() {
        _address = addr.isNotEmpty ? addr : 'Lat: ${lat.toStringAsFixed(5)}, Lng: ${lng.toStringAsFixed(5)}';
        _loadingAddress = false;
      });
    }
  }

  void _onPanUpdate(DragUpdateDetails details, Size mapSize) {
    // 1 pixel drag correlates roughly to angular change inversely proportional to zoom
    final scale = 360.0 / (256.0 * pow(2, _zoom));
    final newLng = (_currentLng - (details.delta.dx * scale)).clamp(-180.0, 180.0);
    final newLat = (_currentLat + (details.delta.dy * scale)).clamp(-85.0, 85.0);

    setState(() {
      _currentLat = newLat;
      _currentLng = newLng;
    });
  }

  void _onPanEnd(DragEndDetails details) {
    _resolveAddress(_currentLat, _currentLng);
  }

  Future<void> _useDeviceGPS() async {
    final pos = await LocationService.getCurrentPosition();
    if (pos != null && mounted) {
      setState(() {
        _currentLat = pos.latitude;
        _currentLng = pos.longitude;
      });
      _resolveAddress(_currentLat, _currentLng);
    }
  }

  // Convert lat/lng into Slippy map tile coordinate (OSM standard)
  int _lngToTileX(double lon, int z) => ((lon + 180.0) / 360.0 * (1 << z)).floor();
  int _latToTileY(double lat, int z) {
    final latRad = lat * pi / 180.0;
    return ((1.0 - log(tan(latRad) + 1.0 / cos(latRad)) / pi) / 2.0 * (1 << z)).floor();
  }

  @override
  Widget build(BuildContext context) {
    final z = _zoom.round().clamp(1, 18);
    final tileX = _lngToTileX(_currentLng, z);
    final tileY = _latToTileY(_currentLat, z);
    final tileUrl = 'https://tile.openstreetmap.org/$z/$tileX/$tileY.png';

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                const Icon(Icons.map, color: Color(0xFF00D4FF), size: 24),
                const SizedBox(width: 8),
                const Text(
                  'Choose Location from Map',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Interactive Map Canvas with OpenStreetMap Slippy Tiles
          Expanded(
            flex: 5,
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Stack(
                  children: [
                    GestureDetector(
                      onPanUpdate: (d) => _onPanUpdate(d, constraints.biggest),
                      onPanEnd: _onPanEnd,
                      child: Container(
                        width: double.infinity,
                        height: double.infinity,
                        color: const Color(0xFF1E293B),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            // Base OpenStreetMap tile
                            Image.network(
                              tileUrl,
                              fit: BoxFit.cover,
                              headers: const {
                                'User-Agent': 'GeoStampPro/1.0.0 (contact@geostamp.pro)',
                              },
                              loadingBuilder: (context, child, progress) {
                                if (progress == null) return child;
                                return const Center(
                                  child: CircularProgressIndicator(color: Color(0xFF00D4FF)),
                                );
                              },
                              errorBuilder: (_, __, ___) => Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.public, size: 60, color: Colors.white24),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Offline / World Map View\nDrag anywhere to position pin',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            // Grid overlay for precise crosshair alignment
                            CustomPaint(
                              painter: MapCrosshairGridPainter(),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Central GPS Crosshair Pin
                    Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black87,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFF00D4FF)),
                            ),
                            child: Text(
                              '${_currentLat.toStringAsFixed(4)}, ${_currentLng.toStringAsFixed(4)}',
                              style: const TextStyle(
                                color: Color(0xFF00D4FF),
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ),
                          const Icon(
                            Icons.location_on,
                            size: 44,
                            color: Color(0xFFFF3366),
                          ),
                          const SizedBox(height: 24), // Center offset for pin tip
                        ],
                      ),
                    ),

                    // Zoom Controls & Current GPS button
                    Positioned(
                      right: 16,
                      bottom: 16,
                      child: Column(
                        children: [
                          FloatingActionButton.small(
                            heroTag: 'map_gps_btn',
                            backgroundColor: const Color(0xFF1E293B),
                            foregroundColor: const Color(0xFF00D4FF),
                            onPressed: _useDeviceGPS,
                            child: const Icon(Icons.my_location),
                          ),
                          const SizedBox(height: 8),
                          FloatingActionButton.small(
                            heroTag: 'map_zoom_in',
                            backgroundColor: const Color(0xFF1E293B),
                            foregroundColor: Colors.white,
                            onPressed: () {
                              if (_zoom < 18) setState(() => _zoom += 1);
                            },
                            child: const Icon(Icons.add),
                          ),
                          const SizedBox(height: 8),
                          FloatingActionButton.small(
                            heroTag: 'map_zoom_out',
                            backgroundColor: const Color(0xFF1E293B),
                            foregroundColor: Colors.white,
                            onPressed: () {
                              if (_zoom > 2) setState(() => _zoom -= 1);
                            },
                            child: const Icon(Icons.remove),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
          ),

          // Preset locations bar
          SizedBox(
            height: 48,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              scrollDirection: Axis.horizontal,
              itemCount: _quickLocations.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final loc = _quickLocations[i];
                final isCurrent = loc['isCurrent'] == true;
                return ActionChip(
                  avatar: Icon(
                    isCurrent ? Icons.my_location : Icons.place,
                    size: 16,
                    color: const Color(0xFF00D4FF),
                  ),
                  label: Text(loc['name']),
                  backgroundColor: const Color(0xFF1E293B),
                  labelStyle: const TextStyle(color: Colors.white, fontSize: 12),
                  side: BorderSide(color: Colors.white.withOpacity(0.1)),
                  onPressed: () {
                    if (isCurrent) {
                      _useDeviceGPS();
                    } else {
                      setState(() {
                        _currentLat = loc['lat'];
                        _currentLng = loc['lng'];
                      });
                      _resolveAddress(_currentLat, _currentLng);
                    }
                  },
                );
              },
            ),
          ),

          // Address & Selection Details
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Color(0xFF1E293B),
              border: Border(top: BorderSide(color: Colors.white12)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.navigation, color: Color(0xFF00D4FF), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _loadingAddress
                          ? const Text(
                              'Geocoding address…',
                              style: TextStyle(color: Colors.white54, fontSize: 12),
                            )
                          : Text(
                              _address,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.check_circle),
                    label: const Text('Confirm This Location'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00D4FF),
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    onPressed: () {
                      Navigator.pop(
                        context,
                        LocationResult(
                          latitude: _currentLat,
                          longitude: _currentLng,
                          address: _address,
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class MapCrosshairGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.04)
      ..strokeWidth = 1.0;

    const step = 40.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
