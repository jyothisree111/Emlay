import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../screens/emergency_screen.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class NotificationService {
  static final FlutterLocalNotificationsPlugin notifications =
      FlutterLocalNotificationsPlugin();

  static const int emergencyNotificationId = 9991;
  static String? launchPayload;
  static String currentMobile = '';

  static const AndroidNotificationChannel channel = AndroidNotificationChannel(
    'emlay_persistent_channel',
    'EMLAY Emergency ID',
    description: 'Persistent Emergency Identity notification for lock screen',
    importance: Importance.high,
  );

  static Future<void> initialize() async {
    if (kIsWeb) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const settings = InitializationSettings(android: androidSettings);

    await notifications.initialize(
      settings: settings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        handleNotificationTap(response.payload);
      },
    );

    final launchDetails = await notifications.getNotificationAppLaunchDetails();
    if (launchDetails?.didNotificationLaunchApp ?? false) {
      launchPayload = launchDetails?.notificationResponse?.payload;
    }

    final androidPlugin = notifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();

    await androidPlugin?.createNotificationChannel(channel);
    await androidPlugin?.requestNotificationsPermission();
  }

  static void handleNotificationTap(String? payload) {
    if (payload == null || payload.isEmpty) return;

    final targetMobile = payload.startsWith('mobile:')
        ? payload.substring(7)
        : currentMobile;

    navigatorKey.currentState?.push(
      MaterialPageRoute(
        builder: (_) => EmergencyScreen(mobile: targetMobile),
      ),
    );
  }

  static Future<void> showPersistentNotification({required String mobile}) async {
    if (kIsWeb) return;

    currentMobile = mobile;

    final androidDetails = AndroidNotificationDetails(
      channel.id,
      channel.name,
      channelDescription: channel.description,
      importance: Importance.high,
      priority: Priority.high,
      ongoing: true, // Persistent foreground notification
      autoCancel: false,
      visibility: NotificationVisibility.public, // Privacy-safe & visible on lock screen
      onlyAlertOnce: true,
      playSound: false,
      enableVibration: false,
      icon: '@mipmap/ic_launcher',
    );

    final details = NotificationDetails(android: androidDetails);

    await notifications.show(
      id: emergencyNotificationId,
      title: 'EMLAY Emergency ID active',
      body: 'Tap for emergency details',
      notificationDetails: details,
      payload: 'mobile:$mobile',
    );
  }

  static Future<void> cancelPersistentNotification() async {
    if (kIsWeb) return;
    await notifications.cancel(id: emergencyNotificationId);
  }
}
