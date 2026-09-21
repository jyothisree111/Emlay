import 'package:flutter/material.dart';

class MissingDeviceScreen extends StatelessWidget {
  final String? emergencyContact;

  const MissingDeviceScreen({super.key, this.emergencyContact});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('DEVICE MISSING'),
        backgroundColor: Colors.red.shade900,
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: Colors.red.shade900.withValues(alpha: 0.3),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.red.shade500, width: 2),
                ),
                child: const Icon(
                  Icons.report_problem,
                  size: 72,
                  color: Colors.redAccent,
                ),
              ),
              const SizedBox(height: 28),
              const Text(
                'This device has been reported missing.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Anti-theft protocol is active. All digital banking (UPI) accounts are frozen, and emergency QR access has been permanently revoked.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade400,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 36),
              if (emergencyContact != null && emergencyContact!.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white12),
                  ),
                  child: Column(
                    children: [
                      const Text(
                        'Found this phone? Contact the registered owner:',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        emergencyContact!,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Return to Normal Setup'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
