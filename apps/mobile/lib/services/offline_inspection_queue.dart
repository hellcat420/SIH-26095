import 'dart:convert';
import 'dart:math';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive/hive.dart';

import 'api_client.dart';

class OfflineInspectionQueue {
  static const boxName = 'offline_inspections';
  static const instituteCacheName = 'cached_institutes';
  static const _keyName = 'dosje_offline_queue_key';

  static Future<Box<dynamic>> open() async {
    const storage = FlutterSecureStorage();
    var encodedKey = await storage.read(key: _keyName);
    if (encodedKey == null) {
      final key = List<int>.generate(32, (_) => Random.secure().nextInt(256));
      encodedKey = base64UrlEncode(key);
      await storage.write(key: _keyName, value: encodedKey);
    }
    final cipher = HiveAesCipher(base64Url.decode(encodedKey));
    await Hive.openBox<dynamic>(
      instituteCacheName,
      encryptionCipher: cipher,
    );
    return Hive.openBox<dynamic>(
      boxName,
      encryptionCipher: cipher,
    );
  }

  static int get pendingCount => Hive.box<dynamic>(boxName).length;

  static Future<void> cacheInstitutes(List<InstituteRecord> institutes) async {
    final box = Hive.box<dynamic>(instituteCacheName);
    await box.put(
      'records',
      institutes
          .map(
            (institute) => {
              'id': institute.id,
              'name': institute.name,
              'address': institute.address,
              'lat': institute.lat,
              'lng': institute.lng,
              'status': institute.status,
            },
          )
          .toList(),
    );
  }

  static List<InstituteRecord> readCachedInstitutes() {
    final records = Hive.box<dynamic>(instituteCacheName).get('records');
    if (records is! List) return const [];
    return records
        .whereType<Map>()
        .map((record) => InstituteRecord.fromJson(Map<String, dynamic>.from(record)))
        .toList(growable: false);
  }

  static Future<void> enqueue(Map<String, dynamic> payload) async {
    final box = Hive.box<dynamic>(boxName);
    final id = payload['clientSubmissionId'] as String;
    await box.put(id, payload);
  }

  static Future<int> syncPending(ApiClient api, String accessToken) async {
    final box = Hive.box<dynamic>(boxName);
    var synced = 0;

    for (final key in box.keys.toList()) {
      final payload = Map<String, dynamic>.from(box.get(key) as Map);
      await api.submitInspection(payload, accessToken);
      await box.delete(key);
      synced++;
    }

    return synced;
  }
}
