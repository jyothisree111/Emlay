import 'package:flutter/material.dart';
import '../config.dart';
import '../models/emergency_profile.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';
import 'emergency_screen.dart';
import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  final String mobile;

  const ProfileScreen({super.key, required this.mobile});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _bloodGroupController = TextEditingController();
  final _allergiesController = TextEditingController();
  final _medicinesController = TextEditingController();
  final _conditionController = TextEditingController();
  final _emergencyContactController = TextEditingController();
  final _trustedContactController = TextEditingController();

  bool _emergencyQrEnabled = true;
  bool _missingMode = false;
  bool _isLoading = true;
  bool _isSaving = false;

  final List<String> _bloodGroups = [
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  ];

  @override
  void initState() {
    super.initState();
    _loadProfileData();
  }

  Future<void> _loadProfileData() async {
    setState(() => _isLoading = true);
    final profile = await ApiService.getProfile(widget.mobile);

    if (profile != null) {
      _nameController.text = profile.fullName;
      _bloodGroupController.text = profile.bloodGroup.isNotEmpty ? profile.bloodGroup : 'O+';
      _allergiesController.text = profile.allergies;
      _medicinesController.text = profile.medicines;
      _conditionController.text = profile.medicalCondition;
      _emergencyContactController.text = profile.emergencyContact;
      _trustedContactController.text = profile.trustedContact;
      _emergencyQrEnabled = profile.emergencyQrEnabled;
      _missingMode = profile.missingMode;

      if (_emergencyQrEnabled && !_missingMode) {
        await NotificationService.showPersistentNotification(mobile: widget.mobile);
      }
    } else {
      // Empty fields for the user to enter their actual details
      _bloodGroupController.text = 'O+';
    }

    setState(() => _isLoading = false);
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    final profile = EmergencyProfile(
      mobile: widget.mobile,
      fullName: _nameController.text.trim(),
      bloodGroup: _bloodGroupController.text.trim(),
      allergies: _allergiesController.text.trim(),
      medicines: _medicinesController.text.trim(),
      medicalCondition: _conditionController.text.trim(),
      emergencyContact: _emergencyContactController.text.trim(),
      trustedContact: _trustedContactController.text.trim(),
      emergencyQrEnabled: _emergencyQrEnabled,
      missingMode: _missingMode,
    );

    final saved = await ApiService.saveProfile(profile);

    setState(() => _isSaving = false);

    if (saved != null) {
      if (_emergencyQrEnabled && !_missingMode) {
        await NotificationService.showPersistentNotification(mobile: widget.mobile);
      } else {
        await NotificationService.cancelPersistentNotification();
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Emergency Profile saved & synced with Firestore!'),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to save profile. Check network connection.'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  Future<void> _toggleEmergencyId(bool value) async {
    setState(() => _emergencyQrEnabled = value);

    if (value) {
      // Start persistent foreground service notification
      await NotificationService.showPersistentNotification(mobile: widget.mobile);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Emergency ID enabled! Persistent lock screen notification active.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } else {
      await NotificationService.cancelPersistentNotification();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Emergency ID disabled. Notification removed.'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    }

    // Auto-save toggle status
    _saveProfile();
  }

  void _showSettingsDialog() {
    final ipController = TextEditingController(text: AppConfig.host);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Server Settings'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: ipController,
              decoration: const InputDecoration(
                labelText: 'PC IP Address',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              await AppConfig.setHost(ipController.text);
              if (!ctx.mounted) return;
              Navigator.pop(ctx);
              if (!mounted) return;
              _loadProfileData();
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _bloodGroupController.dispose();
    _allergiesController.dispose();
    _medicinesController.dispose();
    _conditionController.dispose();
    _emergencyContactController.dispose();
    _trustedContactController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: Colors.red)),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Owner Emergency Profile'),
        backgroundColor: Colors.red.shade700,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: 'Host IP Settings',
            onPressed: _showSettingsDialog,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign Out',
            onPressed: () {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const LoginScreen()),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ========================================================
              // NOTIFICATION BAR BANNER (Tapping opens QR Emergency Screen)
              // ========================================================
              InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => EmergencyScreen(mobile: widget.mobile),
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.red.shade400, width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.red.withValues(alpha: 0.25),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.red.shade700,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.emergency, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'EMLAY Emergency ID active',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 15,
                                  ),
                                ),
                                SizedBox(width: 6),
                                Text(
                                  '• now',
                                  style: TextStyle(color: Colors.grey, fontSize: 11),
                                ),
                              ],
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Tap notification bar for emergency details & QR',
                              style: TextStyle(
                                color: Color(0xFFFCA5A5),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios, color: Colors.white70, size: 16),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Toggle Card: "Enable Emergency ID"
              Card(
                elevation: 3,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: _emergencyQrEnabled ? Colors.green.shade400 : Colors.grey.shade300,
                    width: 1.5,
                  ),
                ),
                color: _emergencyQrEnabled ? Colors.green.shade50 : Colors.grey.shade50,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: _emergencyQrEnabled ? Colors.green.shade100 : Colors.grey.shade200,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _emergencyQrEnabled ? Icons.shield : Icons.shield_outlined,
                          color: _emergencyQrEnabled ? Colors.green.shade800 : Colors.grey.shade700,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Enable Emergency ID',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            Text(
                              _emergencyQrEnabled
                                  ? 'Active foreground notification on lock screen'
                                  : 'Emergency bystander access is turned off',
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: _emergencyQrEnabled,
                        activeThumbColor: Colors.green.shade700,
                        onChanged: _toggleEmergencyId,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Title Header
              Row(
                children: [
                  Icon(Icons.medical_information, color: Colors.red.shade700),
                  const SizedBox(width: 8),
                  const Text(
                    'Emergency Health Details',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Full Name
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Full Name *',
                  prefixIcon: Icon(Icons.person),
                  border: OutlineInputBorder(),
                  filled: true,
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'Enter full name' : null,
              ),
              const SizedBox(height: 14),

              // Blood Group Dropdown/Field
              DropdownButtonFormField<String>(
                initialValue: _bloodGroups.contains(_bloodGroupController.text)
                    ? _bloodGroupController.text
                    : 'O+',
                decoration: const InputDecoration(
                  labelText: 'Blood Group *',
                  prefixIcon: Icon(Icons.bloodtype, color: Colors.red),
                  border: OutlineInputBorder(),
                  filled: true,
                ),
                items: _bloodGroups.map((bg) {
                  return DropdownMenuItem(value: bg, child: Text(bg));
                }).toList(),
                onChanged: (val) {
                  if (val != null) _bloodGroupController.text = val;
                },
              ),
              const SizedBox(height: 14),

              // Allergies
              TextFormField(
                controller: _allergiesController,
                decoration: const InputDecoration(
                  labelText: 'Allergies',
                  hintText: 'e.g. Penicillin, Peanuts, Sulfa',
                  prefixIcon: Icon(Icons.warning_amber),
                  border: OutlineInputBorder(),
                  filled: true,
                ),
              ),
              const SizedBox(height: 14),

              // Medicines
              TextFormField(
                controller: _medicinesController,
                decoration: const InputDecoration(
                  labelText: 'Medicines',
                  hintText: 'e.g. Insulin, Inhaler, Aspirin',
                  prefixIcon: Icon(Icons.medication),
                  border: OutlineInputBorder(),
                  filled: true,
                ),
              ),
              const SizedBox(height: 14),

              // Medical / Health Condition
              TextFormField(
                controller: _conditionController,
                decoration: const InputDecoration(
                  labelText: 'Health / Medical Condition *',
                  hintText: 'e.g. Asthma, Diabetic, Hypertension, or None',
                  prefixIcon: Icon(Icons.health_and_safety, color: Colors.red),
                  border: OutlineInputBorder(),
                  filled: true,
                ),
                validator: (val) => val == null || val.trim().isEmpty
                    ? 'Please enter your health condition (or "None")'
                    : null,
              ),
              const SizedBox(height: 14),

              // Emergency Contact Number
              TextFormField(
                controller: _emergencyContactController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Emergency Contact Number *',
                  hintText: 'e.g. +91 9876543210',
                  prefixIcon: Icon(Icons.phone),
                  border: OutlineInputBorder(),
                  filled: true,
                ),
                validator: (val) =>
                    val == null || val.trim().isEmpty ? 'Enter emergency contact' : null,
              ),
              const SizedBox(height: 14),

              // Trusted Contact Number
              TextFormField(
                controller: _trustedContactController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Trusted Contact (Optional)',
                  hintText: 'e.g. +91 9123456780',
                  prefixIcon: Icon(Icons.contact_emergency),
                  border: OutlineInputBorder(),
                  filled: true,
                ),
              ),
              const SizedBox(height: 24),

              // Save Button
              SizedBox(
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _isSaving ? null : _saveProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red.shade700,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: _isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Icon(Icons.cloud_upload),
                  label: Text(
                    _isSaving ? 'SAVING TO FIRESTORE...' : 'SAVE EMERGENCY PROFILE',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Bystander Screen Preview Action
              SizedBox(
                height: 50,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => EmergencyScreen(mobile: widget.mobile),
                      ),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: Colors.red.shade700),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.qr_code_2, color: Colors.red),
                  label: const Text(
                    'OPEN EMERGENCY SCREEN (BYSTANDER MODE)',
                    style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
