import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Animated,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { ScreenScrollView } from '../components/ScreenScrollView';
import { Stack } from 'expo-router';
import {
  Palette,
  Type,
  Globe,
  Mail,
  Phone,
  Link,
  Eye,
  Check,
  RefreshCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { useRequireProviderMode } from '../hooks/useRequireProviderMode';
import { useEnterprise } from '../providers/EnterpriseProvider';

const COLOR_PRESETS = [
  { name: 'Teal', primary: '#2EC4B6', accent: '#FF6B35' },
  { name: 'Ocean', primary: '#0077B6', accent: '#00B4D8' },
  { name: 'Forest', primary: '#2D6A4F', accent: '#95D5B2' },
  { name: 'Sunset', primary: '#E76F51', accent: '#F4A261' },
  { name: 'Midnight', primary: '#4361EE', accent: '#7209B7' },
  { name: 'Calm', primary: '#6B9080', accent: '#A4C3B2' },
];

export default function EnterpriseWhiteLabel() {
  const canAccess = useRequireProviderMode();
  const { whiteLabel, updateWhiteLabel, organization } = useEnterprise();
  const [appName, setAppName] = useState(whiteLabel.appName);
  const [tagline, setTagline] = useState(whiteLabel.tagline);
  const [primaryColor, setPrimaryColor] = useState(whiteLabel.primaryColor);
  const [accentColor, setAccentColor] = useState(whiteLabel.accentColor);
  const [bgColor, setBgColor] = useState(whiteLabel.backgroundColor);
  const [cardColor, setCardColor] = useState(whiteLabel.cardColor);
  const [customDomain, setCustomDomain] = useState(whiteLabel.customDomain);
  const [supportEmail, setSupportEmail] = useState(whiteLabel.supportEmail);
  const [supportPhone, setSupportPhone] = useState(whiteLabel.supportPhone);
  const [privacyUrl, setPrivacyUrl] = useState(whiteLabel.privacyUrl);
  const [termsUrl, setTermsUrl] = useState(whiteLabel.termsUrl);
  const [isEnabled, setIsEnabled] = useState(whiteLabel.isEnabled);
  const [hasChanges, setHasChanges] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const markChanged = useCallback(() => {
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    updateWhiteLabel({
      isEnabled,
      appName: appName.trim(),
      tagline: tagline.trim(),
      primaryColor,
      accentColor,
      backgroundColor: bgColor,
      cardColor,
      customDomain: customDomain.trim(),
      supportEmail: supportEmail.trim(),
      supportPhone: supportPhone.trim(),
      privacyUrl: privacyUrl.trim(),
      termsUrl: termsUrl.trim(),
    });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHasChanges(false);
    Alert.alert('Saved', 'White-label settings have been updated.');
  }, [isEnabled, appName, tagline, primaryColor, accentColor, bgColor, cardColor, customDomain, supportEmail, supportPhone, privacyUrl, termsUrl, updateWhiteLabel]);

  const handlePresetSelect = useCallback((preset: typeof COLOR_PRESETS[0]) => {
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
    markChanged();
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [markChanged]);

  const handleReset = useCallback(() => {
    setAppName('Guardian');
    setTagline('Wellness support for recovery and life goals');
    setPrimaryColor('#2EC4B6');
    setAccentColor('#FF6B35');
    setBgColor('#0D1B2A');
    setCardColor('#1B2838');
    setCustomDomain('');
    setSupportEmail('');
    setSupportPhone('');
    setPrivacyUrl('');
    setTermsUrl('');
    setIsEnabled(false);
    markChanged();
  }, [markChanged]);

  if (!canAccess) return null;

  if (organization.tier !== 'enterprise') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'White Label', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
        <View style={styles.lockedState}>
          <Palette size={48} color={Colors.textMuted} />
          <Text style={styles.lockedTitle}>Enterprise Feature</Text>
          <Text style={styles.lockedText}>White-label branding is available on the Enterprise plan. Upgrade to customize your organization's look and feel.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'White Label', headerStyle: { backgroundColor: Colors.background }, headerTintColor: Colors.text }} />
      <ScreenScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.enableRow}>
            <View>
              <Text style={styles.enableTitle}>White-Label Mode</Text>
              <Text style={styles.enableSub}>Customize branding for your organization</Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={(val) => { setIsEnabled(val); markChanged(); }}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.previewCard}>
            <View style={[styles.previewHeader, { backgroundColor: primaryColor }]}>
              <Text style={styles.previewAppName}>{appName || 'App Name'}</Text>
            </View>
            <View style={[styles.previewBody, { backgroundColor: bgColor }]}>
              <View style={[styles.previewCardInner, { backgroundColor: cardColor }]}>
                <Text style={styles.previewTagline}>{tagline || 'Your tagline here'}</Text>
                <View style={[styles.previewAccent, { backgroundColor: accentColor }]}>
                  <Text style={styles.previewAccentText}>Action Button</Text>
                </View>
              </View>
            </View>
            <View style={styles.previewLabel}>
              <Eye size={12} color={Colors.textMuted} />
              <Text style={styles.previewLabelText}>Live Preview</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Branding</Text>

            <Text style={styles.inputLabel}>App Name</Text>
            <TextInput
              style={styles.input}
              value={appName}
              onChangeText={(v) => { setAppName(v); markChanged(); }}
              placeholder="Your app name"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Tagline</Text>
            <TextInput
              style={styles.input}
              value={tagline}
              onChangeText={(v) => { setTagline(v); markChanged(); }}
              placeholder="Your tagline"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Color Presets</Text>
            <View style={styles.presetsGrid}>
              {COLOR_PRESETS.map(preset => (
                <Pressable
                  key={preset.name}
                  style={[styles.presetCard, primaryColor === preset.primary && styles.presetActive]}
                  onPress={() => handlePresetSelect(preset)}
                >
                  <View style={styles.presetColors}>
                    <View style={[styles.presetDot, { backgroundColor: preset.primary }]} />
                    <View style={[styles.presetDot, { backgroundColor: preset.accent }]} />
                  </View>
                  <Text style={styles.presetName}>{preset.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Colors</Text>
            <View style={styles.colorRow}>
              <View style={styles.colorInput}>
                <Text style={styles.inputLabel}>Primary</Text>
                <View style={styles.colorInputWrap}>
                  <View style={[styles.colorSwatch, { backgroundColor: primaryColor }]} />
                  <TextInput
                    style={styles.colorTextInput}
                    value={primaryColor}
                    onChangeText={(v) => { setPrimaryColor(v); markChanged(); }}
                    placeholder="#2EC4B6"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <View style={styles.colorInput}>
                <Text style={styles.inputLabel}>Accent</Text>
                <View style={styles.colorInputWrap}>
                  <View style={[styles.colorSwatch, { backgroundColor: accentColor }]} />
                  <TextInput
                    style={styles.colorTextInput}
                    value={accentColor}
                    onChangeText={(v) => { setAccentColor(v); markChanged(); }}
                    placeholder="#FF6B35"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>
            <View style={styles.colorRow}>
              <View style={styles.colorInput}>
                <Text style={styles.inputLabel}>Background</Text>
                <View style={styles.colorInputWrap}>
                  <View style={[styles.colorSwatch, { backgroundColor: bgColor }]} />
                  <TextInput
                    style={styles.colorTextInput}
                    value={bgColor}
                    onChangeText={(v) => { setBgColor(v); markChanged(); }}
                    placeholder="#0D1B2A"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <View style={styles.colorInput}>
                <Text style={styles.inputLabel}>Card</Text>
                <View style={styles.colorInputWrap}>
                  <View style={[styles.colorSwatch, { backgroundColor: cardColor }]} />
                  <TextInput
                    style={styles.colorTextInput}
                    value={cardColor}
                    onChangeText={(v) => { setCardColor(v); markChanged(); }}
                    placeholder="#1B2838"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact & Links</Text>

            <View style={styles.contactField}>
              <Globe size={16} color={Colors.textSecondary} />
              <TextInput
                style={styles.contactInput}
                value={customDomain}
                onChangeText={(v) => { setCustomDomain(v); markChanged(); }}
                placeholder="Custom domain (e.g. recovery.yourorg.com)"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.contactField}>
              <Mail size={16} color={Colors.textSecondary} />
              <TextInput
                style={styles.contactInput}
                value={supportEmail}
                onChangeText={(v) => { setSupportEmail(v); markChanged(); }}
                placeholder="Support email"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.contactField}>
              <Phone size={16} color={Colors.textSecondary} />
              <TextInput
                style={styles.contactInput}
                value={supportPhone}
                onChangeText={(v) => { setSupportPhone(v); markChanged(); }}
                placeholder="Support phone"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.contactField}>
              <Link size={16} color={Colors.textSecondary} />
              <TextInput
                style={styles.contactInput}
                value={privacyUrl}
                onChangeText={(v) => { setPrivacyUrl(v); markChanged(); }}
                placeholder="Privacy policy URL"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.contactField}>
              <Link size={16} color={Colors.textSecondary} />
              <TextInput
                style={styles.contactInput}
                value={termsUrl}
                onChangeText={(v) => { setTermsUrl(v); markChanged(); }}
                placeholder="Terms of service URL"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.actions}>
            {hasChanges && (
              <Pressable style={styles.saveBtn} onPress={handleSave} testID="save-whitelabel">
                <Check size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </Pressable>
            )}
            <Pressable style={styles.resetBtn} onPress={handleReset}>
              <RefreshCw size={14} color={Colors.textSecondary} />
              <Text style={styles.resetBtnText}>Reset to Defaults</Text>
            </Pressable>
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  lockedState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
  },
  lockedText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 8,
    lineHeight: 20,
  },
  enableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  enableTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  enableSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  previewCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 24,
  },
  previewHeader: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  previewAppName: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#fff',
  },
  previewBody: {
    padding: 16,
  },
  previewCardInner: {
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    gap: 10,
  },
  previewTagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center' as const,
  },
  previewAccent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewAccentText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
  previewLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  previewLabelText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    minWidth: 90,
  },
  presetActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(46, 196, 182, 0.08)',
  },
  presetColors: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  presetDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  presetName: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  colorInput: {
    flex: 1,
  },
  colorInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  colorSwatch: {
    width: 36,
    height: 36,
    margin: 4,
    borderRadius: 6,
  },
  colorTextInput: {
    flex: 1,
    padding: 10,
    fontSize: 13,
    color: Colors.text,
  },
  contactField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingLeft: 14,
    marginBottom: 8,
  },
  contactInput: {
    flex: 1,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  resetBtnText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
