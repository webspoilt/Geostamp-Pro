import 'dart:io';
import 'dart:typed_data';
import 'package:image/image.dart' as img;
import 'package:intl/intl.dart';

class StamperService {
  /// Stamp an image file on-device with timestamp, GPS coordinates, and optional address
  static Future<File> stampImage({
    required File imageFile,
    required double latitude,
    required double longitude,
    String? address,
    DateTime? timestamp,
  }) async {
    final bytes = await imageFile.readAsBytes();
    final decoded = img.decodeImage(bytes);
    if (decoded == null) return imageFile;

    final time = timestamp ?? DateTime.now();
    final timeStr = DateFormat('yyyy-MM-dd HH:mm:ss').format(time);

    final latDir = latitude >= 0 ? 'N' : 'S';
    final lngDir = longitude >= 0 ? 'E' : 'W';
    final gpsStr = 'GPS: ${latitude.abs().toStringAsFixed(6)}° $latDir, ${longitude.abs().toStringAsFixed(6)}° $lngDir';

    final textLines = [
      '🕒 $timeStr',
      '📍 $gpsStr',
      if (address != null && address.isNotEmpty) '🏠 $address',
    ];

    // Compute banner layout dimensions
    final padding = 20;
    final lineHeight = 28;
    final bannerHeight = (textLines.length * lineHeight) + (padding * 2);
    final bannerWidth = decoded.width;
    final bannerY = decoded.height - bannerHeight;

    // Draw dark translucent overlay rectangle at bottom
    img.fillRect(
      decoded,
      x1: 0,
      y1: bannerY,
      x2: bannerWidth,
      y2: decoded.height,
      color: img.ColorRgba8(0, 0, 0, 180),
    );

    // Draw stamp text lines
    int currentY = bannerY + padding;
    for (final line in textLines) {
      img.drawString(
        decoded,
        line,
        font: img.arial24,
        x: padding,
        y: currentY,
        color: img.ColorRgba8(255, 255, 255, 255),
      );
      currentY += lineHeight;
    }

    // Save stamped image to new file
    final stampedPath = imageFile.path.replaceAll('.jpg', '_stamped.jpg');
    final stampedBytes = img.encodeJpg(decoded, quality: 88);
    final stampedFile = File(stampedPath);
    await stampedFile.writeAsBytes(stampedBytes);

    return stampedFile;
  }
}
