import 'dart:async';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../config.dart';
import '../models/emergency_profile.dart';
import '../services/api_service.dart';

class EmergencyScreen extends StatefulWidget {
  final String mobile;

  const EmergencyScreen({super.key, required this.mobile});

  @override
  State<EmergencyScreen> createState() => _EmergencyScreenState();
}

class _EmergencyScreenState extends State<EmergencyScreen>
    with SingleTickerProviderStateMixin {
  EmergencyProfile? _profile;
  bool _isLoading = true;
  String _qrUrl = '';
  String _token = '';
  int _secondsRemaining = 300;
  Timer? _countdownTimer;
  late AnimationController _scannerAnimation;

  @override
  void initState() {
    super.initState();
    _scannerAnimation = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    _loadEmergencyData();
  }

  Future<void> _loadEmergencyData() async {
    setState(() => _isLoading = true);

    // 1. Fetch latest profile
    final profile = await ApiService.getProfile(widget.mobile);

    if (profile == null) {
      setState(() {
        _isLoading = false;
      });
      return;
    }

    _profile = profile;

    // Check if emergency access is allowed
    if (_profile!.missingMode || !_profile!.emergencyQrEnabled) {
      setState(() => _isLoading = false);
      return;
    }

    // 2. Request a 5-minute QR Session Token from Backend
    await _refreshQrSession();

    setState(() => _isLoading = false);
  }

  Future<void> _refreshQrSession() async {
    _countdownTimer?.cancel();

    final session = await ApiService.createQrSession(widget.mobile);

    if (session != null && mounted) {
      setState(() {
        _token = session['token'] ?? '';
        _secondsRemaining = session['expiresInSeconds'] ?? 300;
        _qrUrl = session['qrUrl'] ??
            '${AppConfig.responderBaseUrl}/?token=$_token';
      });

      // Start countdown timer
      _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (!mounted) {
          timer.cancel();
          return;
        }

        if (_secondsRemaining <= 1) {
          timer.cancel();
          // Automatically rotate token when expired
          _refreshQrSession();
        } else {
          setState(() {
            _secondsRemaining--;
          });
        }
      });
    }
  }

  String get _formattedCountdown {
    final mins = _secondsRemaining ~/ 60;
    final secs = _secondsRemaining % 60;
    return '${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _scannerAnimation.dispose();
    super.dispose();
  }

  Widget _buildDetailRow(String label, String value, IconData icon, {Color? valueColor}) {
    final displayValue = value.trim().isEmpty ? 'None reported' : value.trim();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 22, color: Colors.red.shade700),
          const SizedBox(width: 12),
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
          ),
          Expanded(
            child: Text(
              displayValue,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: valueColor ?? Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(child: CircularProgressIndicator(color: Colors.red)),
      );
    }

    final isAccessDisabled = _profile == null ||
        _profile!.missingMode == true ||
        _profile!.emergencyQrEnabled == false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('🚨 EMERGENCY ACCESS'),
        backgroundColor: Colors.red.shade800,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Status',
            onPressed: _loadEmergencyData,
          ),
        ],
      ),
      body: isAccessDisabled
          ? _buildDisabledView()
          : _buildActiveEmergencyView(),
    );
  }

  // View shown when missingMode == true or emergencyQrEnabled == false
  Widget _buildDisabledView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.red.shade300, width: 2),
              ),
              child: Icon(Icons.shield, size: 72, color: Colors.red.shade800),
            ),
            const SizedBox(height: 24),
            const Text(
              'Emergency access is currently disabled.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              _profile?.missingMode == true
                  ? 'This device has been marked missing or stolen. Emergency identity and banking features are locked.'
                  : 'Emergency QR feature is currently deactivated by the device owner.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 28),
            OutlinedButton.icon(
              onPressed: _loadEmergencyData,
              icon: const Icon(Icons.refresh),
              label: const Text('Check Status Again'),
            ),
          ],
        ),
      ),
    );
  }

  // View shown when emergency access is active
  Widget _buildActiveEmergencyView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Emergency Header Alert Banner
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.red.shade700,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.red.withValues(alpha: 0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Row(
              children: [
                Icon(Icons.warning, color: Colors.white, size: 28),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'MEDICAL EMERGENCY IDENTITY',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      Text(
                        'Medical info & rotating QR for responders',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          // 1. Saved Emergency Details
          Card(
            elevation: 3,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'CRITICAL HEALTH PROFILE',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                          color: Colors.black87,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.shade200),
                        ),
                        child: Text(
                          'Blood: ${_profile!.bloodGroup.isNotEmpty ? _profile!.bloodGroup : "Unknown"}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.red.shade800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  _buildDetailRow('Full Name', _profile!.fullName, Icons.person),
                  _buildDetailRow('Blood Group', _profile!.bloodGroup, Icons.bloodtype,
                      valueColor: Colors.red.shade800),
                  _buildDetailRow('Allergies', _profile!.allergies, Icons.warning_amber),
                  _buildDetailRow('Medicines', _profile!.medicines, Icons.medication),
                  _buildDetailRow('Medical Condition', _profile!.medicalCondition,
                      Icons.health_and_safety),
                  _buildDetailRow('Emergency Contact', _profile!.emergencyContact, Icons.phone,
                      valueColor: Colors.green.shade800),
                  if (_profile!.trustedContact.isNotEmpty)
                    _buildDetailRow(
                        'Trusted Contact', _profile!.trustedContact, Icons.contact_phone),
                ],
              ),
            ),
          ),

          const SizedBox(height: 22),

          // 2. Rotating QR Section
          Card(
            elevation: 4,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  const Text(
                    'SCAN TO VIEW FULL RESPONDER CARD',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Bystander scans this with any phone camera',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 16),

                  // Timer Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.timer, size: 16, color: Colors.red),
                        const SizedBox(width: 6),
                        Text(
                          'Token auto-rotates in: $_formattedCountdown',
                          style: const TextStyle(
                            color: Colors.red,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Animated Scanning QR Container
                  if (_qrUrl.isNotEmpty)
                    AnimatedBuilder(
                      animation: _scannerAnimation,
                      builder: (context, child) {
                        final progress = _scannerAnimation.value;
                        return Stack(
                          alignment: Alignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    blurRadius: 12,
                                    color: Colors.black.withValues(alpha: 0.1),
                                  ),
                                ],
                              ),
                              child: QrImageView(
                                data: _qrUrl,
                                version: QrVersions.auto,
                                size: 210,
                                backgroundColor: Colors.white,
                              ),
                            ),

                            // Red laser scanning bar
                            Positioned(
                              top: 20 + (190 * progress),
                              left: 20,
                              right: 20,
                              child: Container(
                                height: 3,
                                decoration: BoxDecoration(
                                  color: Colors.red,
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Colors.red,
                                      blurRadius: 8,
                                      spreadRadius: 1,
                                    ),
                                  ],
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                    )
                  else
                    const SizedBox(
                      height: 200,
                      child: Center(
                        child: CircularProgressIndicator(color: Colors.red),
                      ),
                    ),

                  const SizedBox(height: 14),

                  // URL Preview / Link
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _qrUrl,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade700,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
