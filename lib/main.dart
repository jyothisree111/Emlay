import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'firebase_options.dart';
import 'config.dart';
import 'services/notification_service.dart';
import 'screens/login_screen.dart';
import 'screens/profile_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase (emlay-1d8ba)
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (e) {
    debugPrint('Firebase init error: $e');
  }

  // Initialize Network & Persistent Configuration
  await AppConfig.init();

  // Initialize Notification Service
  await NotificationService.initialize();

  // Check saved session
  final prefs = await SharedPreferences.getInstance();
  final savedMobile = prefs.getString('saved_mobile');

  runApp(EmlayApp(initialMobile: savedMobile));

  // If app was launched from tapping the persistent lock-screen notification
  final launchPayload = NotificationService.launchPayload;
  if (launchPayload != null && launchPayload.isNotEmpty) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      NotificationService.handleNotificationTap(launchPayload);
      NotificationService.launchPayload = null;
    });
  }
}

class EmlayApp extends StatelessWidget {
  final String? initialMobile;

  const EmlayApp({super.key, this.initialMobile});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'EMLAY',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFDC2626),
          primary: const Color(0xFFDC2626),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          elevation: 0,
        ),
      ),
      home: initialMobile != null && initialMobile!.isNotEmpty
          ? ProfileScreen(mobile: initialMobile!)
          : const LoginScreen(),
    );
  }
}