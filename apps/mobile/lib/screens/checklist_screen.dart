import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../services/api_client.dart';
import '../services/offline_inspection_queue.dart';

class ChecklistScreen extends StatefulWidget {
  const ChecklistScreen({
    required this.accessToken,
    required this.institute,
    required this.position,
    required this.photoBytes,
    required this.capturedAt,
    super.key,
  });

  final String accessToken;
  final InstituteRecord institute;
  final Position position;
  final Uint8List photoBytes;
  final DateTime capturedAt;

  @override
  State<ChecklistScreen> createState() => _ChecklistScreenState();
}

class _ChecklistScreenState extends State<ChecklistScreen> {
  final _api = ApiClient();
  final _beneficiaryCount = TextEditingController();
  final _notes = TextEditingController();
  bool _cleanliness = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _beneficiaryCount.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final count = int.tryParse(_beneficiaryCount.text.trim());
    if (count == null || count < 0) {
      setState(() => _error = 'Enter a valid non-negative beneficiary count.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    final clientSubmissionId = _newUuid();
    final photoHash = sha256.convert(widget.photoBytes).toString();
    final payload = <String, dynamic>{
      'clientSubmissionId': clientSubmissionId,
      'instituteId': widget.institute.id,
      'checklistResponses': {
        'beneficiary_count': count,
        'cleanliness_check': _cleanliness,
        'notes': _notes.text.trim(),
      },
      'gpsLat': widget.position.latitude,
      'gpsLng': widget.position.longitude,
      'gpsAccuracyMeters': widget.position.accuracy,
      'photos': [
        {
          'fileName': 'inspection-${widget.capturedAt.millisecondsSinceEpoch}.jpg',
          'capturedAt': widget.capturedAt.toIso8601String(),
          'contentBase64': base64Encode(widget.photoBytes),
          'contentType': 'image/jpeg',
          'sha256': photoHash,
        },
      ],
    };

    try {
      await _api.submitInspection(payload, widget.accessToken);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Inspection submitted successfully.')),
      );
      Navigator.of(context).pop(true);
    } on NetworkUnavailableException {
      await OfflineInspectionQueue.enqueue(payload);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Offline: inspection saved securely and queued to sync.')),
      );
      Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      if (error.statusCode != null && error.statusCode! >= 500) {
        await OfflineInspectionQueue.enqueue(payload);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('API unavailable: inspection saved and queued to retry.')),
        );
        Navigator.of(context).pop(true);
        return;
      }
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _newUuid() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Inspection checklist')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(widget.institute.name, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 4),
          Text(
            'Evidence captured ${widget.capturedAt.toLocal()}'
            '\nLocation accuracy ${widget.position.accuracy.round()} m',
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _beneficiaryCount,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Beneficiary attendance count',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Facility cleanliness satisfactory'),
            value: _cleanliness,
            onChanged: _busy ? null : (value) => setState(() => _cleanliness = value),
          ),
          TextField(
            controller: _notes,
            minLines: 3,
            maxLines: 5,
            decoration: const InputDecoration(
              labelText: 'Additional remarks',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.memory(widget.photoBytes, height: 220, fit: BoxFit.cover),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: _busy ? null : _submit,
            icon: _busy
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.cloud_upload_outlined),
            label: Text(_busy ? 'Submitting...' : 'Submit inspection'),
          ),
        ],
      ),
    );
  }
}
