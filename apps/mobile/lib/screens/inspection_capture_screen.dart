import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';

import '../services/api_client.dart';
import 'checklist_screen.dart';

class InspectionCaptureScreen extends StatefulWidget {
  const InspectionCaptureScreen({
    required this.accessToken,
    required this.institutes,
    super.key,
  });

  final String accessToken;
  final List<InstituteRecord> institutes;

  @override
  State<InspectionCaptureScreen> createState() => _InspectionCaptureScreenState();
}

class _InspectionCaptureScreenState extends State<InspectionCaptureScreen> {
  final _picker = ImagePicker();
  InstituteRecord? _selectedInstitute;
  Position? _position;
  Uint8List? _photoBytes;
  DateTime? _capturedAt;
  double? _distanceMeters;
  bool _busy = false;
  String? _error;

  Future<void> _validateLocation() async {
    final institute = _selectedInstitute;
    if (institute == null) {
      setState(() => _error = 'Select an institute first.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw Exception('Enable location services to continue.');
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw Exception('Location permission is required for an inspection.');
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 20),
      );
      final distance = Geolocator.distanceBetween(
        position.latitude,
        position.longitude,
        institute.lat,
        institute.lng,
      );
      if (!mounted) return;
      setState(() {
        _position = position;
        _distanceMeters = distance;
        _photoBytes = null;
        _capturedAt = null;
      });
      if (distance > 100) {
        setState(() => _error = 'You are ${distance.round()} m away. Inspection must be within 100 m.');
      }
    } on Exception catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _capturePhoto() async {
    if (!_isInsideGeofence) {
      setState(() => _error = 'Validate that you are within 100 m before capturing evidence.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final photo = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1280,
        imageQuality: 75,
      );
      if (photo == null) return;

      final capturedAt = DateTime.now().toUtc();
      final original = img.decodeImage(await photo.readAsBytes());
      if (original == null) throw Exception('The captured photo could not be decoded.');
      final resized = original.width > 1280
          ? img.copyResize(original, width: 1280)
          : original;
      img.drawString(
        resized,
        'GPS ${_position!.latitude.toStringAsFixed(5)}, ${_position!.longitude.toStringAsFixed(5)}',
        font: img.arial14,
        x: 8,
        y: 8,
        color: img.ColorRgb8(255, 255, 255),
      );
      img.drawString(
        resized,
        capturedAt.toIso8601String(),
        font: img.arial14,
        x: 8,
        y: 26,
        color: img.ColorRgb8(255, 255, 255),
      );

      if (!mounted) return;
      setState(() {
        _photoBytes = Uint8List.fromList(img.encodeJpg(resized, quality: 75));
        _capturedAt = capturedAt;
      });
    } on Exception catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _continueToChecklist() async {
    final institute = _selectedInstitute;
    final position = _position;
    final photo = _photoBytes;
    final capturedAt = _capturedAt;
    if (institute == null || position == null || photo == null || capturedAt == null || !_isInsideGeofence) {
      setState(() => _error = 'Select an institute, validate the location, and capture a photo first.');
      return;
    }

    await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => ChecklistScreen(
          accessToken: widget.accessToken,
          institute: institute,
          position: position,
          photoBytes: photo,
          capturedAt: capturedAt,
        ),
      ),
    );
  }

  bool get _isInsideGeofence => _distanceMeters != null && _distanceMeters! <= 100;

  @override
  Widget build(BuildContext context) {
    final institute = _selectedInstitute;
    return Scaffold(
      appBar: AppBar(title: const Text('Inspection capture')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Capture geotagged evidence', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 16),
          DropdownButtonFormField<InstituteRecord>(
            key: ValueKey(institute?.id),
            initialValue: institute,
            decoration: const InputDecoration(
              labelText: 'Institute',
              border: OutlineInputBorder(),
            ),
            items: widget.institutes
                .map(
                  (item) => DropdownMenuItem(
                    value: item,
                    child: Text(item.name, overflow: TextOverflow.ellipsis),
                  ),
                )
                .toList(),
            onChanged: _busy
                ? null
                : (item) => setState(() {
                      _selectedInstitute = item;
                      _position = null;
                      _distanceMeters = null;
                      _photoBytes = null;
                      _capturedAt = null;
                      _error = null;
                    }),
          ),
          if (institute != null) ...[
            const SizedBox(height: 8),
            Text(institute.address),
            Text('Registered location: ${institute.lat.toStringAsFixed(5)}, ${institute.lng.toStringAsFixed(5)}'),
          ],
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              leading: Icon(
                _isInsideGeofence ? Icons.verified : Icons.location_searching,
                color: _isInsideGeofence ? Colors.green : Colors.orange,
              ),
              title: Text(_distanceMeters == null
                  ? 'Location not validated'
                  : _isInsideGeofence
                      ? 'Within inspection radius'
                      : 'Outside inspection radius'),
              subtitle: _position == null
                  ? const Text('Must be within 100 m of the selected institute.')
                  : Text(
                      '${_position!.latitude.toStringAsFixed(5)}, ${_position!.longitude.toStringAsFixed(5)}'
                      ' · accuracy ${_position!.accuracy.round()} m'
                      ' · distance ${_distanceMeters!.round()} m',
                    ),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _busy ? null : _validateLocation,
            icon: const Icon(Icons.my_location),
            label: Text(_busy ? 'Please wait...' : 'Validate GPS location'),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _busy || !_isInsideGeofence ? null : _capturePhoto,
            icon: const Icon(Icons.camera_alt),
            label: Text(_photoBytes == null ? 'Capture photo' : 'Retake photo'),
          ),
          if (_photoBytes != null) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.memory(_photoBytes!, height: 240, fit: BoxFit.cover),
            ),
            const SizedBox(height: 6),
            const Text('GPS and capture timestamp stamped on evidence.'),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy || _photoBytes == null ? null : _continueToChecklist,
            child: const Text('Continue to checklist'),
          ),
        ],
      ),
    );
  }
}
