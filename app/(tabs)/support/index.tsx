import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { ScreenScrollView } from '../../../components/ScreenScrollView';
import { Stack } from 'expo-router';
import {
  Phone,
  Globe,
  MessageCircle,
} from 'lucide-react-native';
import Colors from '../../../constants/colors';

interface HelpCenter {
  id: string;
  name: string;
  description: string;
  /** Shown on the call button (may include instructions). */
  phone: string;
  /** If set, this value is normalized for `tel:` (omit extra words). */
  dialPhone?: string;
  textLine?: string;
  /** When set with `textLine`, tapping the text row opens the SMS composer to this number. */
  textSmsNumber?: string;
  website: string;
  available: string;
  category: 'crisis' | 'substance' | 'mental' | 'specialized';
}

const HELP_CENTERS: HelpCenter[] = [
  {
    id: '1',
    name: 'SAMHSA National Helpline',
    description: 'Free, confidential, 24/7 treatment referral and information service for substance abuse and mental health.',
    phone: '1-800-662-4357',
    website: 'https://www.samhsa.gov/find-help/national-helpline',
    available: '24/7, 365 days a year',
    category: 'substance',
  },
  {
    id: '2',
    name: '988 Suicide & Crisis Lifeline',
    description: 'Free and confidential emotional support for people in suicidal crisis or emotional distress.',
    phone: '988',
    website: 'https://988lifeline.org',
    available: '24/7',
    category: 'crisis',
  },
  {
    id: '3',
    name: 'Crisis Text Line',
    description: 'Text-based crisis support for anyone in any type of crisis.',
    phone: '',
    textLine: 'Text HOME or HOLA to 741741',
    textSmsNumber: '741741',
    website: 'https://www.crisistextline.org',
    available: '24/7',
    category: 'crisis',
  },
  {
    id: '4',
    name: 'National Drug Helpline',
    description: 'Free referral service for drug and alcohol treatment centers.',
    phone: '1-844-289-0879',
    website: 'https://drughelpline.org',
    available: '24/7',
    category: 'substance',
  },
  {
    id: '5',
    name: 'Alcoholics Anonymous (AA)',
    description: 'Fellowship of people who share experience, strength, and hope to solve their common problem with alcohol.',
    phone: '1-212-870-3400',
    website: 'https://www.aa.org',
    available: 'Business hours; meetings 24/7',
    category: 'substance',
  },
  {
    id: '6',
    name: 'Narcotics Anonymous (NA)',
    description: 'Peer-led recovery program for people struggling with drug addiction.',
    phone: '',
    website: 'https://www.na.org',
    available: 'Business hours; meetings 24/7',
    category: 'substance',
  },
  {
    id: '7',
    name: 'National Alliance on Mental Illness (NAMI)',
    description: 'Advocacy, education, support, and public awareness for individuals and families affected by mental illness.',
    phone: '1-800-950-6264',
    textLine: 'Text NAMI to 62640',
    website: 'https://www.nami.org',
    available: 'Mon–Fri, 10am–10pm ET',
    category: 'mental',
  },
  {
    id: '8',
    name: 'Veterans Crisis Line',
    description: 'Connects veterans and their families with qualified VA responders.',
    phone: '988 then (Press 1)',
    dialPhone: '988',
    textLine: 'Text 838255',
    website: 'https://www.veteranscrisisline.net',
    available: '24/7',
    category: 'specialized',
  },
  {
    id: '9',
    name: 'National Domestic Violence Hotline',
    description: 'Support for victims of domestic violence, including those with co-occurring substance abuse.',
    phone: '1-800-799-7233',
    textLine: 'Text START to 88788',
    website: 'https://www.thehotline.org',
    available: '24/7',
    category: 'specialized',
  },
  {
    id: '10',
    name: 'SMART Recovery',
    description: 'Science-based addiction recovery support program as an alternative to 12-step groups.',
    phone: '1-440-951-5357',
    website: 'https://www.smartrecovery.org',
    available: 'Business hours; online meetings 24/7',
    category: 'substance',
  },
  {
    id: '11',
    name: 'Partnership to End Addiction',
    description: 'Helpline for parents and caregivers concerned about a child\'s substance use.',
    phone: '1-212-841-5200',
    textLine: 'Text CONNECT to 55753',
    website: 'https://drugfree.org',
    available: 'Mon–Fri, 9am–10pm ET; weekends limited',
    category: 'substance',
  },
  {
    id: '12',
    name: 'National Council on Problem Gambling',
    description: 'Confidential help for problem gamblers and their families.',
    phone: '1-800-522-4700',
    textLine: 'Text 1-800-522-4700',
    website: 'https://www.ncpgambling.org',
    available: '24/7',
    category: 'specialized',
  },
  {
    id: '13',
    name: 'Al-Anon Family Groups',
    description: 'Mutual support program for people whose lives have been affected by someone else\'s drinking.',
    phone: '1-888-425-2666',
    website: 'https://al-anon.org',
    available: 'Mon–Fri, 8am–6pm ET',
    category: 'substance',
  },
  {
    id: '14',
    name: 'Poison Control Center',
    description: 'Immediate guidance for poisonings and overdoses.',
    phone: '1-800-222-1222',
    website: 'https://www.poison.org',
    available: '24/7',
    category: 'crisis',
  },
  {
    id: '15',
    name: 'National Eating Disorders Association',
    description: 'Support for individuals and families affected by eating disorders.',
    phone: '1-212-575-6200',
    website: 'https://www.nationaleatingdisorders.org',
    available: 'Mon–Thu, 11am–9pm ET; Fri 11am–5pm ET',
    category: 'specialized',
  },
  {
    id: '16',
    name: 'Sex Addicts Anonymous (SAA)',
    description:
      'Twelve Step fellowship for anyone who wants to stop addictive sexual behavior. Members share experience, strength, and hope.',
    phone: '1-713-869-4902',
    website: 'https://www.saa-recovery.org',
    available: 'ISO office business hours; meetings worldwide',
    category: 'specialized',
  },
  {
    id: '17',
    name: 'Sex and Love Addicts Anonymous (SLAA)',
    description:
      'Twelve Step fellowship for recovery from sex and love addiction. The only requirement for membership is a desire to stop living out a pattern of sex and love addiction.',
    phone: '1-210-828-7900',
    website: 'https://www.slaafws.org',
    available: 'Mon–Fri, 9am–5pm CST (Fellowship-Wide Services); meetings worldwide',
    category: 'specialized',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  crisis: 'Crisis Lines',
  substance: 'Substance Abuse',
  mental: 'Mental Health',
  specialized: 'Specialized Support',
};

const CATEGORY_COLORS: Record<string, string> = {
  crisis: '#EF5350',
  substance: '#2EC4B6',
  mental: '#FFB347',
  specialized: '#7E57C2',
};

/** Same body as the Support tab route; embedded on Connection when Resources is selected. */
export function SupportResourcesContent() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCall = useCallback((dial: string, displayLabel?: string) => {
    const cleaned = dial.replace(/[^0-9+]/g, '');
    if (!cleaned) return;
    const url = `tel:${cleaned}`;
    const shown = displayLabel ?? dial;
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to Call', `Please dial ${shown} manually.`);
    });
  }, []);

  const handleWebsite = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to Open', 'Could not open the website.');
    });
  }, []);

  const handleSms = useCallback((number: string) => {
    const cleaned = number.replace(/[^0-9+]/g, '');
    if (!cleaned) return;
    const url = `sms:${cleaned}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to Open Messages', `Please text ${number} manually from your messaging app.`);
    });
  }, []);

  const categories = ['crisis', 'substance', 'mental', 'specialized'];
  const filteredCenters = selectedCategory
    ? HELP_CENTERS.filter(c => c.category === selectedCategory)
    : HELP_CENTERS;

  const renderCenterCard = (center: HelpCenter) => {
    const catColor = CATEGORY_COLORS[center.category] ?? Colors.primary;
    return (
      <View key={center.id} style={styles.centerCard}>
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
          <Text style={[styles.categoryBadgeText, { color: catColor }]}>
            {CATEGORY_LABELS[center.category]}
          </Text>
        </View>
        <Text style={styles.centerName}>{center.name}</Text>
        <Text style={styles.centerDesc}>{center.description}</Text>
        <Text style={styles.centerAvailable}>{center.available}</Text>

        <View style={styles.centerActions}>
          {center.phone ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.success + '18' }]}
              onPress={() => handleCall(center.dialPhone ?? center.phone, center.phone)}
              activeOpacity={0.7}
              testID={`call-${center.id}`}
            >
              <Phone size={16} color={Colors.success} />
              <Text style={[styles.actionBtnText, { color: Colors.success }]}>{center.phone}</Text>
            </TouchableOpacity>
          ) : null}

          {center.textLine ? (
            center.textSmsNumber ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.primary + '18' }]}
                onPress={() => handleSms(center.textSmsNumber ?? '')}
                activeOpacity={0.7}
                testID={`text-${center.id}`}
              >
                <MessageCircle size={16} color={Colors.primary} />
                <Text style={[styles.actionBtnText, { color: Colors.primary }]}>{center.textLine}</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.actionBtn, { backgroundColor: Colors.primary + '18' }]}>
                <MessageCircle size={16} color={Colors.primary} />
                <Text style={[styles.actionBtnText, { color: Colors.primary }]}>{center.textLine}</Text>
              </View>
            )
          ) : null}

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.accent + '18' }]}
            onPress={() => handleWebsite(center.website)}
            activeOpacity={0.7}
            testID={`web-${center.id}`}
          >
            <Globe size={16} color={Colors.accent} />
            <Text style={[styles.actionBtnText, { color: Colors.accent }]}>Website</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container} testID="support-resources-content">
      <ScreenScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.nationalHeader}>
            <View style={styles.nationalIconContainer}>
              <Phone size={22} color={Colors.white} />
            </View>
            <Text style={styles.nationalTitle}>National Help Centers</Text>
            <Text style={styles.nationalSubtitle}>Professional support available anytime</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={styles.filterContent}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                !selectedCategory && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  !selectedCategory && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterChip,
                  selectedCategory === cat && {
                    backgroundColor: CATEGORY_COLORS[cat] + '25',
                    borderColor: CATEGORY_COLORS[cat],
                  },
                ]}
                onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === cat && { color: CATEGORY_COLORS[cat] },
                  ]}
                >
                  {CATEGORY_LABELS[cat]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredCenters.map(renderCenterCard)}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            If you are in immediate danger, please call 911.
          </Text>
        </View>
      </ScreenScrollView>
    </View>
  );
}

export default function SupportScreen() {
  return (
    <View style={styles.routeRoot}>
      <Stack.Screen options={{ title: 'Support & Resources' }} />
      <SupportResourcesContent />
    </View>
  );
}

const styles = StyleSheet.create({
  routeRoot: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  section: {
    paddingHorizontal: 16,
  },

  nationalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    marginHorizontal: 16,
    gap: 12,
  },
  nationalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  nationalDividerLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  nationalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  nationalIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  nationalTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  nationalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterRow: {
    marginBottom: 14,
    marginTop: 8,
  },
  filterContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
  },
  centerCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  centerDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 8,
  },
  centerAvailable: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  centerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.danger,
    textAlign: 'center',
  },

});
