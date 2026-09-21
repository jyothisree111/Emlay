import 'package:shared_preferences/shared_preferences.dart';

class AppConfig {
  static const String defaultHost = '172.25.185.197';
  static const int backendPort = 5000;
  static const int responderPort = 3000;

  static String _host = defaultHost;

  static String get host => _host;

  static String get apiBaseUrl => 'http://$_host:$backendPort/api';
  static String get responderBaseUrl => 'http://$_host:$responderPort';

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _host = prefs.getString('emlay_host_ip') ?? defaultHost;
  }

  static Future<void> setHost(String newHost) async {
    _host = newHost.trim();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('emlay_host_ip', _host);
  }
}
