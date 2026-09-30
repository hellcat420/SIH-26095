import 'dart:convert';
import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static String get baseUrl {
    const configuredUrl = String.fromEnvironment('DOSJE_API_URL');
    if (configuredUrl.isNotEmpty) return configuredUrl;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://127.0.0.1:3000';
  }

  Future<Map<String, dynamic>> requestOtp(String phone) {
    return _request<Map<String, dynamic>>(
      '/auth/request-otp',
      method: 'POST',
      body: {'phone': phone},
    );
  }

  Future<Map<String, dynamic>> login(String phone, String otp) {
    return _request<Map<String, dynamic>>(
      '/auth/login',
      method: 'POST',
      body: {'phone': phone, 'otp': otp},
    );
  }

  Future<Map<String, dynamic>> profile(String accessToken) {
    return _request<Map<String, dynamic>>(
      '/auth/profile',
      accessToken: accessToken,
    );
  }

  Future<Map<String, dynamic>> refresh(String refreshToken) {
    return _request<Map<String, dynamic>>(
      '/auth/refresh',
      method: 'POST',
      body: {'refreshToken': refreshToken},
    );
  }

  Future<List<InstituteRecord>> institutes(String accessToken) async {
    final data = await _request<List<dynamic>>(
      '/institutes',
      accessToken: accessToken,
    );
    return data
        .whereType<Map<String, dynamic>>()
        .map(InstituteRecord.fromJson)
        .toList(growable: false);
  }

  Future<Map<String, dynamic>> submitInspection(
    Map<String, dynamic> payload,
    String accessToken,
  ) {
    return _request<Map<String, dynamic>>(
      '/inspections',
      method: 'POST',
      body: payload,
      accessToken: accessToken,
    );
  }

  Future<Map<String, dynamic>> startRandomVc(String instituteId, String accessToken) {
    return _request<Map<String, dynamic>>(
      '/notifications/random-vc',
      method: 'POST',
      body: {'instituteId': instituteId},
      accessToken: accessToken,
    );
  }

  Future<void> endVc(String sessionId, String accessToken) async {
    await _request<Map<String, dynamic>>(
      '/notifications/sessions/$sessionId/end',
      method: 'PATCH',
      accessToken: accessToken,
    );
  }

  Future<void> registerDeviceToken(
    String token,
    String platform,
    String accessToken,
  ) async {
    await _request<Map<String, dynamic>>(
      '/notifications/device-token',
      method: 'POST',
      body: {'token': token, 'platform': platform},
      accessToken: accessToken,
    );
  }

  Future<T> _request<T>(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
    String? accessToken,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (accessToken != null) {
      headers['Authorization'] = 'Bearer $accessToken';
    }

    late final http.Response response;
    try {
      final request = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) request.body = jsonEncode(body);
      final streamedResponse = await _client.send(request).timeout(
            const Duration(seconds: 20),
          );
      response = await http.Response.fromStream(streamedResponse);
    } on SocketException {
      throw const NetworkUnavailableException();
    } on http.ClientException {
      throw const NetworkUnavailableException();
    } on HttpException {
      throw const NetworkUnavailableException();
    } on TimeoutException {
      throw const NetworkUnavailableException();
    }

    final dynamic decoded;
    try {
      decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    } on FormatException {
      throw const ApiException('The server returned an invalid response.');
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map<String, dynamic>
          ? decoded['message'] ?? decoded['detail']
          : null;
      throw ApiException(
        message is String ? message : 'Request failed (${response.statusCode}).',
        statusCode: response.statusCode,
      );
    }

    return decoded as T;
  }
}

class InstituteRecord {
  const InstituteRecord({
    required this.id,
    required this.name,
    required this.address,
    required this.lat,
    required this.lng,
    required this.status,
  });

  final String id;
  final String name;
  final String address;
  final double lat;
  final double lng;
  final String status;

  factory InstituteRecord.fromJson(Map<String, dynamic> json) {
    return InstituteRecord(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Unnamed institute',
      address: json['address'] as String? ?? '',
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      status: json['status'] as String? ?? 'Active',
    );
  }
}

class NetworkUnavailableException implements Exception {
  const NetworkUnavailableException();

  @override
  String toString() => 'The API is unreachable. Check your connection and try again.';
}
