import 'dart:convert';
import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../services/api_client.dart';
import '../services/offline_inspection_queue.dart';
import 'inspection_capture_screen.dart';
import 'vc_call_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController(text: '9876543210');
  final _otpController = TextEditingController();
  final _storage = const FlutterSecureStorage();
  final _api = ApiClient();

  bool _otpSent = false;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final token = await _storage.read(key: 'dosje_access_token');
    if (token == null) return;
    final refreshToken = await _storage.read(key: 'dosje_refresh_token');

    try {
      final user = await _api.profile(token);
      if (!mounted) return;
      _openDashboard(token, user, refreshToken: refreshToken);
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        if (refreshToken != null) {
          try {
            final auth = await _api.refresh(refreshToken);
            final newToken = auth['accessToken'] as String;
            final newRefreshToken = auth['refreshToken'] as String;
            await _storage.write(key: 'dosje_access_token', value: newToken);
            await _storage.write(key: 'dosje_refresh_token', value: newRefreshToken);
            final user = await _api.profile(newToken);
            if (mounted) _openDashboard(newToken, user, refreshToken: newRefreshToken);
            return;
          } on ApiException {
            await _clearSession();
          } on NetworkUnavailableException {
            await _openOfflineSession(token, refreshToken);
          }
        } else {
          await _clearSession();
        }
        return;
      }
      if (mounted) setState(() => _error = error.message);
    } on NetworkUnavailableException {
      await _openOfflineSession(token, refreshToken);
    }
  }

  Future<void> _openOfflineSession(String token, String? refreshToken) async {
    final cachedUser = await _storage.read(key: 'dosje_user');
    if (!mounted) return;
    if (cachedUser == null) {
      setState(() => _error = 'Could not validate the saved session. Check API connectivity and retry.');
      return;
    }
    try {
      _openDashboard(
        token,
        jsonDecode(cachedUser) as Map<String, dynamic>,
        refreshToken: refreshToken,
      );
    } on FormatException {
      setState(() => _error = 'Saved profile data is invalid. Sign in again while online.');
    }
  }

  Future<void> _requestOtp() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      setState(() => _error = 'Please enter your registered mobile number.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _api.requestOtp(phone);
      if (!mounted) return;
      final demoOtp = response['developmentOtp'];
      setState(() {
        _otpSent = true;
        if (demoOtp is String) _otpController.text = demoOtp;
      });
      if (demoOtp is String) {
        _showSnackBar('Demo OTP: $demoOtp');
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } on NetworkUnavailableException catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _login() async {
    final phone = _phoneController.text.trim();
    final otp = _otpController.text.trim();
    if (phone.isEmpty || otp.isEmpty) {
      setState(() => _error = 'Enter both phone number and OTP.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final auth = await _api.login(phone, otp);
      final token = auth['accessToken'] as String;
      await _storage.write(key: 'dosje_access_token', value: token);
      await _storage.write(key: 'dosje_refresh_token', value: auth['refreshToken'] as String);
      final user = Map<String, dynamic>.from(auth['user'] as Map);
      await _storage.write(key: 'dosje_user', value: jsonEncode(user));
      if (mounted) {
        _openDashboard(token, user, refreshToken: auth['refreshToken'] as String);
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } on NetworkUnavailableException catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _clearSession() async {
    await _storage.delete(key: 'dosje_access_token');
    await _storage.delete(key: 'dosje_refresh_token');
    await _storage.delete(key: 'dosje_user');
  }

  void _openDashboard(
    String token,
    Map<String, dynamic> user, {
    String? refreshToken,
  }) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => DashboardHome(
          accessToken: token,
          refreshToken: refreshToken,
          user: user,
        ),
      ),
    );
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FF),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 8),
                    Icon(Icons.shield_outlined, size: 52, color: Theme.of(context).primaryColor),
                    const SizedBox(height: 16),
                    const Text(
                      'DoSJE Monitoring',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Secure inspector access',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Mobile number',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.phone_android),
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: _isLoading ? null : _requestOtp,
                      icon: const Icon(Icons.send_to_mobile),
                      label: Text(_otpSent ? 'Resend OTP' : 'Request OTP'),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _otpController,
                      keyboardType: TextInputType.number,
                      enabled: _otpSent,
                      decoration: const InputDecoration(
                        labelText: 'Enter OTP',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.lock_clock),
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(_error!, style: const TextStyle(color: Colors.red)),
                    ],
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: _isLoading || !_otpSent ? null : _login,
                      icon: _isLoading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.login),
                      label: const Text('Verify & Continue'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class DashboardHome extends StatefulWidget {
  const DashboardHome({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
    super.key,
  });

  final String accessToken;
  final String? refreshToken;
  final Map<String, dynamic> user;

  @override
  State<DashboardHome> createState() => _DashboardHomeState();
}

class _DashboardHomeState extends State<DashboardHome> with WidgetsBindingObserver {
  final _storage = const FlutterSecureStorage();
  final _api = ApiClient();
  List<InstituteRecord> _institutes = [];
  bool _loading = true;
  String? _error;
  String? _syncMessage;
  String? _vcError;
  String _accessToken = '';
  String? _refreshToken;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  StreamSubscription<String>? _pushTokenSubscription;

  @override
  void initState() {
    super.initState();
    _accessToken = widget.accessToken;
    _refreshToken = widget.refreshToken;
    WidgetsBinding.instance.addObserver(this);
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((results) {
      if (results.any((result) => result != ConnectivityResult.none)) {
        _syncQueuedInspections();
      }
    });
    _registerPushToken();
    _loadData();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _syncQueuedInspections();
    }
  }

  Future<void> _registerPushToken() async {
    if (!const bool.fromEnvironment('DOSJE_FIREBASE_CONFIGURED')) {
      if (mounted) setState(() => _syncMessage = 'Push notifications are not configured for this app build.');
      return;
    }

    try {
      await Firebase.initializeApp();
      final messaging = FirebaseMessaging.instance;
      final permission = await messaging.requestPermission();
      if (permission.authorizationStatus == AuthorizationStatus.denied) {
        if (mounted) {
          setState(() => _syncMessage = 'Push notifications are disabled in device settings.');
        }
        return;
      }
      final platform = switch (defaultTargetPlatform) {
        TargetPlatform.android => 'android',
        TargetPlatform.iOS => 'ios',
        _ => 'web',
      };
      final token = await messaging.getToken();
      if (token != null) await _savePushToken(token, platform);
      _pushTokenSubscription = messaging.onTokenRefresh.listen(
        (newToken) => _savePushToken(newToken, platform),
      );
    } on FirebaseException catch (error) {
      if (mounted) setState(() => _syncMessage = 'Firebase setup failed: ${error.message ?? error.code}.');
    } on ApiException catch (error) {
      if (mounted) setState(() => _syncMessage = 'Device registration failed: ${error.message}');
    } on NetworkUnavailableException catch (error) {
      if (mounted) setState(() => _syncMessage = error.toString());
    }
  }

  Future<void> _savePushToken(String token, String platform) async {
    try {
      await _withAuthRefresh(
        (accessToken) => _api.registerDeviceToken(token, platform, accessToken),
      );
    } on ApiException catch (error) {
      if (mounted) setState(() => _syncMessage = 'Device registration failed: ${error.message}');
    } on NetworkUnavailableException catch (error) {
      if (mounted) setState(() => _syncMessage = error.toString());
    }
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final institutes = await _withAuthRefresh((token) => _api.institutes(token));
      await OfflineInspectionQueue.cacheInstitutes(institutes);
      if (!mounted) return;
      setState(() {
        _institutes = institutes;
        _loading = false;
      });
      await _syncQueuedInspections();
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
          _loading = false;
        });
      }
    } on NetworkUnavailableException catch (error) {
      final cached = OfflineInspectionQueue.readCachedInstitutes();
      if (mounted) {
        setState(() {
          _institutes = cached;
          _error = cached.isEmpty ? error.toString() : null;
          _syncMessage = cached.isEmpty ? null : 'Offline mode: showing saved institutes.';
          _loading = false;
        });
      }
      await _syncQueuedInspections();
    }
  }

  Future<void> _syncQueuedInspections() async {
    if (OfflineInspectionQueue.pendingCount == 0) return;
    try {
      final synced = await _withAuthRefresh(
        (token) => OfflineInspectionQueue.syncPending(_api, token),
      );
      if (mounted && synced > 0) {
        setState(() => _syncMessage = '$synced queued inspection(s) synced.');
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _syncMessage = 'Queued sync failed: ${error.message}');
    } on NetworkUnavailableException {
      if (mounted) setState(() => _syncMessage = 'Offline. ${OfflineInspectionQueue.pendingCount} inspection(s) queued.');
    }
  }

  Future<T> _withAuthRefresh<T>(Future<T> Function(String token) request) async {
    try {
      return await request(_accessToken);
    } on ApiException catch (error) {
      if (error.statusCode != 401 || _refreshToken == null) rethrow;
      final tokens = await _api.refresh(_refreshToken!);
      _accessToken = tokens['accessToken'] as String;
      _refreshToken = tokens['refreshToken'] as String;
      await _storage.write(key: 'dosje_access_token', value: _accessToken);
      await _storage.write(key: 'dosje_refresh_token', value: _refreshToken);
      return request(_accessToken);
    }
  }

  Future<void> _logout() async {
    await _storage.delete(key: 'dosje_access_token');
    await _storage.delete(key: 'dosje_refresh_token');
    await _storage.delete(key: 'dosje_user');
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_connectivitySubscription?.cancel());
    unawaited(_pushTokenSubscription?.cancel());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final name = widget.user['name'] as String? ?? 'Inspector';
    return Scaffold(
      appBar: AppBar(
        title: const Text('DoSJE Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout),
            onPressed: _logout,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Welcome, $name', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                leading: const Icon(Icons.location_on, color: Colors.indigo),
                title: const Text('Registered institutes'),
                trailing: _loading ? const CircularProgressIndicator() : Text('${_institutes.length}'),
              ),
            ),
            Card(
              child: ListTile(
                leading: const Icon(Icons.sync, color: Colors.orange),
                title: const Text('Inspections waiting to sync'),
                trailing: Text('${OfflineInspectionQueue.pendingCount}'),
              ),
            ),
            if (_syncMessage != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(_syncMessage!),
              ),
            if (_vcError != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(_vcError!, style: const TextStyle(color: Colors.red)),
              ),
            if (_error != null)
              Card(
                color: Colors.red.shade50,
                child: ListTile(
                  title: Text(_error!, style: const TextStyle(color: Colors.red)),
                  trailing: IconButton(
                    tooltip: 'Retry',
                    icon: const Icon(Icons.refresh),
                    onPressed: _loadData,
                  ),
                ),
              ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _loading || _institutes.isEmpty ? null : _startInspection,
              icon: const Icon(Icons.add_a_photo),
              label: const Text('Start an inspection'),
            ),
            if (!_loading && _institutes.isEmpty && _error == null)
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: Text('No institutes are registered yet. Add one through the API before starting an inspection.'),
              ),
            if (_institutes.isNotEmpty) ...[
              const SizedBox(height: 20),
              Text('Institute actions', style: Theme.of(context).textTheme.titleMedium),
              for (final institute in _institutes)
                Card(
                  child: ListTile(
                    title: Text(institute.name),
                    subtitle: Text(institute.address),
                    trailing: IconButton(
                      tooltip: 'Start random virtual inspection',
                      icon: const Icon(Icons.video_call),
                      onPressed: () => _startRandomVc(institute),
                    ),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _startInspection() async {
    await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => InspectionCaptureScreen(
          accessToken: _accessToken,
          institutes: _institutes,
        ),
      ),
    );
    if (mounted) await _loadData();
  }

  Future<void> _startRandomVc(InstituteRecord institute) async {
    setState(() => _vcError = null);
    try {
      final call = await _withAuthRefresh(
        (token) => _api.startRandomVc(institute.id, token),
      );
      final session = Map<String, dynamic>.from(call['session'] as Map);
      if (!mounted) return;
      await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => VCCallScreen(
            accessToken: _accessToken,
            liveKitUrl: call['serverUrl'] as String,
            liveKitToken: call['token'] as String,
            sessionId: session['id'] as String,
            roomName: call['roomName'] as String,
          ),
        ),
      );
      if (mounted) await _loadData();
    } on ApiException catch (error) {
      if (mounted) setState(() => _vcError = error.message);
    } on NetworkUnavailableException catch (error) {
      if (mounted) setState(() => _vcError = error.toString());
    }
  }
}
