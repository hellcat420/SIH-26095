import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:livekit_client/livekit_client.dart';

import '../services/api_client.dart';

class VCCallScreen extends StatefulWidget {
  const VCCallScreen({
    required this.accessToken,
    required this.liveKitUrl,
    required this.liveKitToken,
    required this.sessionId,
    required this.roomName,
    super.key,
  });

  final String accessToken;
  final String liveKitUrl;
  final String liveKitToken;
  final String sessionId;
  final String roomName;

  @override
  State<VCCallScreen> createState() => _VCCallScreenState();
}

class _VCCallScreenState extends State<VCCallScreen> {
  final _api = ApiClient();
  Room? _room;
  bool _connected = false;
  bool _cameraEnabled = true;
  bool _microphoneEnabled = true;
  bool _ending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _connect();
  }

  Future<void> _connect() async {
    final room = Room();
    try {
      final liveKitUrl = !kIsWeb && defaultTargetPlatform == TargetPlatform.android
          ? widget.liveKitUrl.replaceFirst('localhost', '10.0.2.2')
          : widget.liveKitUrl;
      await room.connect(liveKitUrl, widget.liveKitToken);
      await room.localParticipant?.setCameraEnabled(true);
      await room.localParticipant?.setMicrophoneEnabled(true);
      if (!mounted) {
        await room.disconnect();
        return;
      }
      setState(() {
        _room = room;
        _connected = true;
      });
    } on Exception catch (error) {
      await room.disconnect();
      if (mounted) setState(() => _error = 'Unable to join the LiveKit room: $error');
    }
  }

  Future<void> _toggleCamera() async {
    final enabled = !_cameraEnabled;
    await _room?.localParticipant?.setCameraEnabled(enabled);
    if (mounted) setState(() => _cameraEnabled = enabled);
  }

  Future<void> _toggleMicrophone() async {
    final enabled = !_microphoneEnabled;
    await _room?.localParticipant?.setMicrophoneEnabled(enabled);
    if (mounted) setState(() => _microphoneEnabled = enabled);
  }

  Future<void> _endCall() async {
    setState(() {
      _ending = true;
      _error = null;
    });
    try {
      await _room?.disconnect();
      await _api.endVc(widget.sessionId, widget.accessToken);
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } on NetworkUnavailableException catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _ending = false);
    }
  }

  @override
  void dispose() {
    unawaited(_room?.disconnect());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Virtual inspection')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.videocam, size: 64, color: Colors.indigo),
            const SizedBox(height: 20),
            const Text(
              'LiveKit virtual inspection',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Text('Room: ${widget.roomName}', textAlign: TextAlign.center),
            const SizedBox(height: 12),
            Text(
              _connected ? 'Connected' : _error == null ? 'Connecting...' : 'Not connected',
              textAlign: TextAlign.center,
              style: TextStyle(color: _connected ? Colors.green : Colors.orange),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
            ],
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton.filledTonal(
                  tooltip: _cameraEnabled ? 'Turn camera off' : 'Turn camera on',
                  onPressed: !_connected ? null : _toggleCamera,
                  icon: Icon(_cameraEnabled ? Icons.videocam : Icons.videocam_off),
                ),
                const SizedBox(width: 16),
                IconButton.filledTonal(
                  tooltip: _microphoneEnabled ? 'Mute microphone' : 'Unmute microphone',
                  onPressed: !_connected ? null : _toggleMicrophone,
                  icon: Icon(_microphoneEnabled ? Icons.mic : Icons.mic_off),
                ),
              ],
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _ending ? null : _endCall,
              icon: const Icon(Icons.call_end),
              label: Text(_ending ? 'Ending session...' : 'Leave and end session'),
              style: FilledButton.styleFrom(backgroundColor: Colors.red),
            ),
          ],
        ),
      ),
    );
  }
}
