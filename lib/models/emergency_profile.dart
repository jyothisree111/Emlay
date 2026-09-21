class EmergencyProfile {
  final String mobile;
  final String fullName;
  final String bloodGroup;
  final String allergies;
  final String medicines;
  final String medicalCondition;
  final String emergencyContact;
  final String trustedContact;
  final bool emergencyQrEnabled;
  final bool missingMode;

  EmergencyProfile({
    required this.mobile,
    this.fullName = '',
    this.bloodGroup = '',
    this.allergies = '',
    this.medicines = '',
    this.medicalCondition = '',
    this.emergencyContact = '',
    this.trustedContact = '',
    this.emergencyQrEnabled = true,
    this.missingMode = false,
  });

  Map<String, dynamic> toJson() {
    return {
      'mobile': mobile,
      'fullName': fullName,
      'bloodGroup': bloodGroup,
      'allergies': allergies,
      'medicines': medicines,
      'medicalCondition': medicalCondition,
      'emergencyContact': emergencyContact,
      'trustedContact': trustedContact,
      'emergencyQrEnabled': emergencyQrEnabled,
      'missingMode': missingMode,
    };
  }

  factory EmergencyProfile.fromJson(Map<String, dynamic> json) {
    return EmergencyProfile(
      mobile: json['mobile']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? json['name']?.toString() ?? '',
      bloodGroup: json['bloodGroup']?.toString() ?? '',
      allergies: json['allergies']?.toString() ?? '',
      medicines: json['medicines']?.toString() ?? '',
      medicalCondition: json['medicalCondition']?.toString() ?? json['condition']?.toString() ?? '',
      emergencyContact: json['emergencyContact']?.toString() ?? '',
      trustedContact: json['trustedContact']?.toString() ?? '',
      emergencyQrEnabled: json['emergencyQrEnabled'] == true,
      missingMode: json['missingMode'] == true,
    );
  }

  EmergencyProfile copyWith({
    String? mobile,
    String? fullName,
    String? bloodGroup,
    String? allergies,
    String? medicines,
    String? medicalCondition,
    String? emergencyContact,
    String? trustedContact,
    bool? emergencyQrEnabled,
    bool? missingMode,
  }) {
    return EmergencyProfile(
      mobile: mobile ?? this.mobile,
      fullName: fullName ?? this.fullName,
      bloodGroup: bloodGroup ?? this.bloodGroup,
      allergies: allergies ?? this.allergies,
      medicines: medicines ?? this.medicines,
      medicalCondition: medicalCondition ?? this.medicalCondition,
      emergencyContact: emergencyContact ?? this.emergencyContact,
      trustedContact: trustedContact ?? this.trustedContact,
      emergencyQrEnabled: emergencyQrEnabled ?? this.emergencyQrEnabled,
      missingMode: missingMode ?? this.missingMode,
    );
  }
}
