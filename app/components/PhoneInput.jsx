import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  FlatList,
  Platform,
  TouchableWithoutFeedback
} from 'react-native';
import * as Icons from 'lucide-react-native';

const countryCodes = [
    // African countries
    { code: 'GH', dialCode: '+233', name: 'Ghana', flag: '🇬🇭' },
    { code: 'NG', dialCode: '+234', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'KE', dialCode: '+254', name: 'Kenya', flag: '🇰🇪' },
    { code: 'ZA', dialCode: '+27', name: 'South Africa', flag: '🇿🇦' },
    
    // Americas
    { code: 'US', dialCode: '+1', name: 'United States', flag: '🇺🇸' },
    { code: 'CA', dialCode: '+1', name: 'Canada', flag: '🇨🇦' },
    { code: 'BR', dialCode: '+55', name: 'Brazil', flag: '🇧🇷' },
    { code: 'MX', dialCode: '+52', name: 'Mexico', flag: '🇲🇽' },
    { code: 'AR', dialCode: '+54', name: 'Argentina', flag: '🇦🇷' },
    
    // Europe
    { code: 'GB', dialCode: '+44', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'DE', dialCode: '+49', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', dialCode: '+33', name: 'France', flag: '🇫🇷' },
    { code: 'IT', dialCode: '+39', name: 'Italy', flag: '🇮🇹' },
    { code: 'ES', dialCode: '+34', name: 'Spain', flag: '🇪🇸' },
    { code: 'NL', dialCode: '+31', name: 'Netherlands', flag: '🇳🇱' },
    { code: 'SE', dialCode: '+46', name: 'Sweden', flag: '🇸🇪' },
    { code: 'CH', dialCode: '+41', name: 'Switzerland', flag: '🇨🇭' },
    
    // Middle East
    { code: 'AE', dialCode: '+971', name: 'United Arab Emirates', flag: '🇦🇪' },
    { code: 'SA', dialCode: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
    { code: 'QA', dialCode: '+974', name: 'Qatar', flag: '🇶🇦' },
    { code: 'OM', dialCode: '+968', name: 'Oman', flag: '🇴🇲' },
    
    // Asia
    { code: 'CN', dialCode: '+86', name: 'China', flag: '🇨🇳' },
    { code: 'JP', dialCode: '+81', name: 'Japan', flag: '🇯🇵' },
    { code: 'KR', dialCode: '+82', name: 'South Korea', flag: '🇰🇷' },
    { code: 'IN', dialCode: '+91', name: 'India', flag: '🇮🇳' },
    { code: 'ID', dialCode: '+62', name: 'Indonesia', flag: '🇮🇩' },
    { code: 'TH', dialCode: '+66', name: 'Thailand', flag: '🇹🇭' },
    { code: 'SG', dialCode: '+65', name: 'Singapore', flag: '🇸🇬' },
    
    // Oceania
    { code: 'AU', dialCode: '+61', name: 'Australia', flag: '🇦🇺' },
    { code: 'NZ', dialCode: '+64', name: 'New Zealand', flag: '🇳🇿' }
  ];

const PhoneInput = ({ 
  value = '', 
  onChange, 
  style, 
  placeholder = 'Phone number',
  defaultCountry = 'GH'
}) => {
  const [selectedCountry, setSelectedCountry] = useState(
    countryCodes.find(c => c.code === defaultCountry) || countryCodes[0]
  );
  const [phoneNumber, setPhoneNumber] = useState(value.replace(/^(\+[0-9]+)/, ''));
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (onChange) {
      const fullNumber = selectedCountry.dialCode + phoneNumber;
      onChange(fullNumber);
    }
  }, [phoneNumber, selectedCountry]);

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setModalVisible(false);
  };

  const formatPhoneNumber = (text) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, '');
    setPhoneNumber(cleaned);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Country Code Button */}
      <TouchableOpacity 
        style={styles.countryCodeButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.flagText}>{selectedCountry.flag}</Text>
        <Text style={styles.dialCodeText}>{selectedCountry.dialCode}</Text>
        <Icons.ChevronDown size={16} color="#666" />
      </TouchableOpacity>

      {/* Phone Number Input */}
      <TextInput
        style={styles.phoneInput}
        placeholder={placeholder}
        placeholderTextColor="#999"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={formatPhoneNumber}
        maxLength={15}
      />

      {/* Country Selector Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Country</Text>
          <FlatList
            data={countryCodes}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.countryItem}
                onPress={() => handleCountrySelect(item)}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
                <Text style={styles.countryDialCode}>{item.dialCode}</Text>
              </TouchableOpacity>
            )}
            style={styles.countryList}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    marginRight: 12,
  },
  flagText: {
    fontSize: 20,
    marginRight: 8,
  },
  dialCodeText: {
    color: '#fff',
    marginRight: 4,
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    height: '100%',
    paddingVertical: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
    marginTop: 'auto',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  countryList: {
    width: '100%',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  countryFlag: {
    fontSize: 20,
    width: 30,
  },
  countryName: {
    color: '#fff',
    flex: 1,
    marginLeft: 12,
  },
  countryDialCode: {
    color: '#888',
    marginLeft: 8,
  },
});

export default PhoneInput;