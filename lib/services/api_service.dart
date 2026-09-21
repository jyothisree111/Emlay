import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config.dart';
import '../models/emergency_profile.dart';

class ApiService {
  static final http.Client _client = http.Client();

  // POST /api/auth/login
  static Future<Map<String, dynamic>> login(String mobile, String password) async {
    try {
      final url = Uri.parse('${AppConfig.apiBaseUrl}/auth/login');
      final response = await _client.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'mobile': mobile.trim(),
          'password': password.trim(),
        }),
      ).timeout(const Duration(seconds: 5));

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      return data;
    } catch (e) {
      debugPrint('[ApiService] login network error: $e');
      // Local fallback for offline / mock testing: validate password rule locally
      final cleanMobile = mobile.trim();
      final cleanPassword = password.trim();
      if (cleanPassword == '${cleanMobile}1234') {
        return {
          'success': true,
          'mobile': cleanMobile,
        };
      }
      return {
        'success': false,
        'error': 'Network connection failed. Check PC IP in settings.',
      };
    }
  }

  // POST /api/emergency-profile
  static Future<EmergencyProfile?> saveProfile(EmergencyProfile profile) async {
    // 1. Save via Backend API
    try {
      final url = Uri.parse('${AppConfig.apiBaseUrl}/emergency-profile');
      final response = await _client.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(profile.toJson()),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['profile'] != null) {
          profile = EmergencyProfile.fromJson(data['profile']);
        }
      }
    } catch (e) {
      debugPrint('[ApiService] saveProfile API error: $e');
    }

    // 2. Also save directly to Cloud Firestore
    try {
      await FirebaseFirestore.instance
          .collection('emergencyProfiles')
          .doc(profile.mobile)
          .set(profile.toJson(), SetOptions(merge: true));
      debugPrint('[ApiService] Saved directly to Firestore emergencyProfiles/${profile.mobile}');
    } catch (e) {
      debugPrint('[ApiService] Firestore direct save error: $e');
    }

    return profile;
  }

  // GET /api/emergency-profile/:mobile
  static Future<EmergencyProfile?> getProfile(String mobile) async {
    // 1. Try Backend API first
    try {
      final url = Uri.parse('${AppConfig.apiBaseUrl}/emergency-profile/$mobile');
      final response = await _client.get(url).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['profile'] != null) {
          return EmergencyProfile.fromJson(data['profile']);
        }
      }
    } catch (e) {
      debugPrint('[ApiService] getProfile API error: $e');
    }

    // 2. Try direct Firestore read fallback
    try {
      final doc = await FirebaseFirestore.instance
          .collection('emergencyProfiles')
          .doc(mobile)
          .get();

      if (doc.exists && doc.data() != null) {
        return EmergencyProfile.fromJson(doc.data()!);
      }
    } catch (e) {
      debugPrint('[ApiService] Firestore direct get error: $e');
    }

    return null;
  }

  // POST /api/qr-session
  // Returns: { token, expiresInSeconds, expiresAt, qrUrl }
  static Future<Map<String, dynamic>?> createQrSession(String mobile) async {
    try {
      final url = Uri.parse('${AppConfig.apiBaseUrl}/qr-session');
      final response = await _client.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'mobile': mobile.trim()}),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        final err = jsonDecode(response.body);
        debugPrint('[ApiService] createQrSession error: $err');
      }
    } catch (e) {
      debugPrint('[ApiService] createQrSession network error: $e');
      // Local fallback token if backend unreachable during offline demo
      final token = 'OFFLINE-${DateTime.now().millisecondsSinceEpoch}';
      return {
        'token': token,
        'expiresInSeconds': 300,
        'qrUrl': '${AppConfig.responderBaseUrl}/?token=$token',
      };
    }
    return null;
  }

  // POST /api/report-missing
  static Future<bool> reportMissing(String mobile) async {
    try {
      final url = Uri.parse('${AppConfig.apiBaseUrl}/report-missing');
      final response = await _client.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'mobile': mobile.trim()}),
      ).timeout(const Duration(seconds: 5));

      return response.statusCode == 200;
    } catch (e) {
      debugPrint('[ApiService] reportMissing network error: $e');
      return false;
    }
  }
}
