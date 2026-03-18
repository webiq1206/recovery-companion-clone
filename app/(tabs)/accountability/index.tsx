import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Animated,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import {
  Shield,
  Plus,
  Check,
  X,
  AlertTriangle,
  Users,
  FileText,
  Flame,
  Heart,
  ChevronRight,
  Clock,
  TrendingUp,
  Eye,
  Bell,
  UserPlus,
  Phone,
  ShieldCheck,
  ShieldAlert,
  MessageCircle,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAccountability } from '@/core/domains/useAccountability';
import { useUser } from '@/core/domains/useUser';
import { useCheckin } from '@/core/domains/useCheckin';
import { usePledges } from '@/core/domains/usePledges';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { CommitmentContract, AccountabilityPartner } from '@/types';

const CATEGORIES: { key: CommitmentContract['category']; label: string; icon: string }[] = [
  { key: 'sobriety', label: 'Sobriety', icon: 'shield' },
  { key: 'health', label: 'Health', icon: 'heart' },
  { key: 'relationships', label: 'Relationships', icon: 'users' },
  { key: 'growth', label: 'Growth', icon: 'trending' },
  { key: 'boundaries', label: 'Boundaries', icon: 'lock' },
];

const RELATIONSHIP_OPTIONS: AccountabilityPartner['relationship'][] = [
  'friend', 'family', 'sponsor', 'peer', 'therapist',
];

const ENCOURAGEMENTS = [
  "You're building something real. Keep going.",
  "Every day you show up is a win.",
  "Consistency beats perfection. You're doing great.",
  "Your future self will thank you for today.",
  "Small steps, big changes. You've got this.",
  "Recovery is not linear, but you're still moving forward.",
  "You chose courage today. That matters.",
];

function getCategoryColor(category: CommitmentContract['category']): string {
  switch (category) {
    case 'sobriety': return Colors.primary;
    case 'health': return Colors.success;
    case 'relationships': return Colors.accentWarm;
    case 'growth': return '#7C8CF8';
    case 'boundaries': return Colors.accent;
    default: return Colors.primary;
  }
}

function getDriftAlerts(
  contracts: CommitmentContract[],
  checkIns: { date: string; stabilityScore: number; cravingLevel: number; mood: number }[],
  daysSober: number,
): { id: string; type: string; severity: 'gentle' | 'moderate' | 'urgent'; message: string; suggestion: string }[] {
  const alerts: { id: string; type: string; severity: 'gentle' | 'moderate' | 'urgent'; message: string; suggestion: string }[] = [];
  const today = new Date().toISOString().split('T')[0];

  contracts.forEach(c => {
    if (!c.isActive) return;
    if (c.lastCheckedIn && c.lastCheckedIn !== today) {
      const lastDate = new Date(c.lastCheckedIn);
      const diff = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
      if (diff >= 3) {
        alerts.push({
          id: `missed-${c.id}`,
          type: 'missed_checkin',
          severity: diff >= 5 ? 'urgent' : 'moderate',
          message: `You haven't checked in on "${c.title}" for ${diff} days`,
          suggestion: 'A quick check-in keeps momentum. Even one word counts.',
        });
      }
    }
    if (c.streakDays > 7 && c.streakDays % 7 === 6) {
      alerts.push({
        id: `streak-risk-${c.id}`,
        type: 'streak_risk',
        severity: 'gentle',
        message: `Your ${c.streakDays}-day streak on "${c.title}" is worth protecting`,
        suggestion: 'Check in today to keep your streak alive.',
      });
    }
  });

  if (checkIns.length >= 3) {
    const recent = checkIns.slice(0, 3);
    const avgMood = recent.reduce((s, c) => s + c.mood, 0) / recent.length;
    if (avgMood < 2.5) {
      alerts.push({
        id: 'mood-decline',
        type: 'mood_decline',
        severity: 'moderate',
        message: "Your mood has been lower than usual recently",
        suggestion: 'Consider reaching out to someone you trust, or take a moment for self-care.',
      });
    }
    const avgCraving = recent.reduce((s, c) => s + c.cravingLevel, 0) / recent.length;
    if (avgCraving > 7) {
      alerts.push({
        id: 'craving-spike',
        type: 'craving_spike',
        severity: 'urgent',
        message: "Cravings have been elevated lately",
        suggestion: "This is temporary. Use your coping tools, reach out to your partner, or open Crisis Mode.",
      });
    }
  }

  return alerts;
}

export default function AccountabilityScreen() {
  const { hasFeature } = useSubscription();
  const {
    accountabilityData,
    addContract,
    updateContract,
    deleteContract,
    checkInContract,
    addPartner,
    deletePartner,
    useStreakProtection: triggerStreakProtection,
  } = useAccountability();
  const { checkIns } = useCheckin();
  const { daysSober, profile } = useUser();
  const { currentStreak } = usePledges();

  const [activeTab, setActiveTab] = useState<'contracts' | 'partners' | 'alerts'>('contracts');
  const [showNewContract, setShowNewContract] = useState<boolean>(false);
  const [showNewPartner, setShowNewPartner] = useState<boolean>(false);
  const [showCheckInModal, setShowCheckInModal] = useState<boolean>(false);
  const [selectedContractId, setSelectedContractId] = useState<string>('');

  const [contractTitle, setContractTitle] = useState<string>('');
  const [contractDesc, setContractDesc] = useState<string>('');
  const [contractCategory, setContractCategory] = useState<CommitmentContract['category']>('sobriety');

  const [partnerName, setPartnerName] = useState<string>('');
  const [partnerPhone, setPartnerPhone] = useState<string>('');
  const [partnerRelationship, setPartnerRelationship] = useState<AccountabilityPartner['relationship']>('friend');

  const [checkInNote, setCheckInNote] = useState<string>('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const encouragement = useMemo(() => {
    const idx = Math.floor(Date.now() / 86400000) % ENCOURAGEMENTS.length;
    return ENCOURAGEMENTS[idx];
  }, []);

  const driftAlerts = useMemo(() => {
    return getDriftAlerts(accountabilityData.contracts, checkIns, daysSober);
  }, [accountabilityData.contracts, checkIns, daysSober]);

  const activeContracts = useMemo(() => {
    return accountabilityData.contracts.filter(c => c.isActive);
  }, [accountabilityData.contracts]);

  const overallStrength = useMemo(() => {
    if (activeContracts.length === 0) return 0;
    const totalStreak = activeContracts.reduce((s, c) => s + c.streakDays, 0);
    const avgStreak = totalStreak / activeContracts.length;
    return Math.min(100, Math.round((avgStreak / 30) * 100));
  }, [activeContracts]);

  const handleCreateContract = useCallback(() => {
    if (!contractTitle.trim()) {
      Alert.alert('Missing title', 'Give your commitment a name.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + 30);

    const contract: CommitmentContract = {
      id: Date.now().toString(),
      title: contractTitle.trim(),
      description: contractDesc.trim(),
      category: contractCategory,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      isActive: true,
      checkIns: [],
      streakDays: 0,
      lastCheckedIn: '',
    };
    addContract(contract);
    setContractTitle('');
    setContractDesc('');
    setContractCategory('sobriety');
    setShowNewContract(false);
  }, [contractTitle, contractDesc, contractCategory, addContract]);

  const handleCheckIn = useCallback((honored: boolean) => {
    if (!selectedContractId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    checkInContract(selectedContractId, honored, checkInNote.trim());
    setCheckInNote('');
    setSelectedContractId('');
    setShowCheckInModal(false);
  }, [selectedContractId, checkInNote, checkInContract]);

  const handleAddPartner = useCallback(() => {
    if (!partnerName.trim()) {
      Alert.alert('Missing name', 'Enter your partner\'s name.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const partner: AccountabilityPartner = {
      id: Date.now().toString(),
      name: partnerName.trim(),
      relationship: partnerRelationship,
      phone: partnerPhone.trim(),
      isConnected: true,
      addedAt: new Date().toISOString(),
      lastSharedAt: '',
      sharingLevel: 'minimal',
    };
    addPartner(partner);
    setPartnerName('');
    setPartnerPhone('');
    setPartnerRelationship('friend');
    setShowNewPartner(false);
  }, [partnerName, partnerPhone, partnerRelationship, addPartner]);

  const handleDeleteContract = useCallback((id: string, title: string) => {
    Alert.alert(
      'Remove Commitment',
      `Are you sure you want to remove "${title}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteContract(id);
        }},
      ]
    );
  }, [deleteContract]);

  const handleDeletePartner = useCallback((id: string, name: string) => {
    Alert.alert(
      'Remove Partner',
      `Remove ${name} as your accountability partner?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deletePartner(id);
        }},
      ]
    );
  }, [deletePartner]);

  const handleStreakProtection = useCallback(() => {
    const remaining = accountabilityData.streakProtectionMax - accountabilityData.streakProtectionUsed;
    if (remaining <= 0) {
      Alert.alert('No protections left', 'You\'ve used all your streak protections this period.');
      return;
    }
    Alert.alert(
      'Use Streak Protection',
      `This will protect all your streaks for today. You have ${remaining} left.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Use Protection', onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          triggerStreakProtection();
        }},
      ]
    );
  }, [accountabilityData, triggerStreakProtection]);

  const renderStrengthMeter = () => {
    const color = overallStrength > 66 ? Colors.success : overallStrength > 33 ? Colors.accentWarm : Colors.danger;
    return (
      <View style={styles.strengthCard}>
        <View style={styles.strengthHeader}>
          <View style={styles.strengthTitleRow}>
            <ShieldCheck size={20} color={Colors.primary} />
            <Text style={styles.strengthTitle}>Commitment Strength</Text>
          </View>
          <Text style={[styles.strengthPercent, { color }]}>{overallStrength}%</Text>
        </View>
        <View style={styles.strengthBarBg}>
          <Animated.View
            style={[
              styles.strengthBarFill,
              {
                width: `${overallStrength}%`,
                backgroundColor: color,
                transform: [{ scaleY: pulseAnim }],
              },
            ]}
          />
        </View>
        <Text style={styles.strengthSubtext}>
          {activeContracts.length} active commitment{activeContracts.length !== 1 ? 's' : ''}
          {currentStreak > 0 ? ` · ${currentStreak}d pledge streak` : ''}
        </Text>
      </View>
    );
  };

  const renderEncouragement = () => (
    <View style={styles.encouragementCard}>
      <Heart size={14} color={Colors.accentWarm} />
      <Text style={styles.encouragementText}>{encouragement}</Text>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabRow}>
      {([
        { key: 'contracts' as const, label: 'Commitments', icon: FileText },
        { key: 'partners' as const, label: 'Partners', icon: Users },
        { key: 'alerts' as const, label: 'Alerts', icon: Bell, badge: driftAlerts.length },
      ]).map(tab => (
        <Pressable
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab(tab.key);
          }}
          testID={`tab-${tab.key}`}
        >
          <View style={styles.tabInner}>
            <tab.icon size={16} color={activeTab === tab.key ? Colors.white : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            {tab.badge && tab.badge > 0 ? (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );

  const renderContractCard = (contract: CommitmentContract) => {
    const catColor = getCategoryColor(contract.category);
    const today = new Date().toISOString().split('T')[0];
    const checkedToday = contract.lastCheckedIn === today;

    return (
      <View key={contract.id} style={styles.contractCard} testID={`contract-${contract.id}`}>
        <View style={styles.contractTop}>
          <View style={[styles.catDot, { backgroundColor: catColor }]} />
          <View style={styles.contractInfo}>
            <Text style={styles.contractTitle}>{contract.title}</Text>
            {contract.description ? (
              <Text style={styles.contractDesc} numberOfLines={2}>{contract.description}</Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => handleDeleteContract(contract.id, contract.title)}
            hitSlop={8}
            testID={`delete-contract-${contract.id}`}
          >
            <X size={16} color={Colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.contractStats}>
          <View style={styles.statItem}>
            <Flame size={14} color={Colors.accent} />
            <Text style={styles.statValue}>{contract.streakDays}</Text>
            <Text style={styles.statLabel}>streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Check size={14} color={Colors.success} />
            <Text style={styles.statValue}>{contract.checkIns.filter(ci => ci.honored).length}</Text>
            <Text style={styles.statLabel}>honored</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Clock size={14} color={Colors.textMuted} />
            <Text style={styles.statValue}>
              {Math.max(0, Math.floor((new Date(contract.expiresAt).getTime() - Date.now()) / 86400000))}d
            </Text>
            <Text style={styles.statLabel}>left</Text>
          </View>
        </View>

        {checkedToday ? (
          <View style={styles.checkedInBanner}>
            <Check size={14} color={Colors.success} />
            <Text style={styles.checkedInText}>Checked in today</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.checkInButton, pressed && { opacity: 0.8 }]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedContractId(contract.id);
              setShowCheckInModal(true);
            }}
            testID={`checkin-${contract.id}`}
          >
            <Eye size={14} color={Colors.primary} />
            <Text style={styles.checkInButtonText}>Check In</Text>
          </Pressable>
        )}

        {contract.checkIns.length > 0 && (
          <View style={styles.recentCheckins}>
            {contract.checkIns.slice(0, 5).map(ci => (
              <View
                key={ci.id}
                style={[styles.checkInDot, { backgroundColor: ci.honored ? Colors.success : Colors.danger }]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderContracts = () => (
    <View>
      {activeContracts.length === 0 ? (
        <View style={styles.emptyState}>
          <FileText size={40} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No commitments yet</Text>
          <Text style={styles.emptySubtext}>
            Create a personal contract — a promise to yourself that anchors your recovery.
          </Text>
        </View>
      ) : (
        activeContracts.map(renderContractCard)
      )}

      <Pressable
        style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        onPress={() => {
          Haptics.selectionAsync();
          setShowNewContract(true);
        }}
        testID="add-contract"
      >
        <Plus size={18} color={Colors.primary} />
        <Text style={styles.addButtonText}>New Commitment</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.protectionButton, pressed && { opacity: 0.85 }]}
        onPress={handleStreakProtection}
        testID="streak-protection"
      >
        <ShieldAlert size={16} color={Colors.accentWarm} />
        <Text style={styles.protectionText}>
          Streak Protection ({accountabilityData.streakProtectionMax - accountabilityData.streakProtectionUsed} left)
        </Text>
      </Pressable>
    </View>
  );

  const renderPartners = () => (
    <View>
      {accountabilityData.partners.length === 0 ? (
        <View style={styles.emptyState}>
          <Users size={40} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No partners connected</Text>
          <Text style={styles.emptySubtext}>
            Add someone you trust. They don't need the app — just someone who cares.
          </Text>
        </View>
      ) : (
        accountabilityData.partners.map(partner => (
          <View key={partner.id} style={styles.partnerCard} testID={`partner-${partner.id}`}>
            <View style={styles.partnerAvatar}>
              <Text style={styles.partnerInitial}>{partner.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>{partner.name}</Text>
              <Text style={styles.partnerRole}>{partner.relationship}</Text>
              {partner.phone ? (
                <View style={styles.partnerPhoneRow}>
                  <Phone size={11} color={Colors.textMuted} />
                  <Text style={styles.partnerPhone}>{partner.phone}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.partnerActions}>
              <View style={[styles.sharingBadge, { backgroundColor: partner.sharingLevel === 'full' ? Colors.primary : partner.sharingLevel === 'moderate' ? Colors.accentWarm : Colors.textMuted }]}>
                <Text style={styles.sharingBadgeText}>{partner.sharingLevel}</Text>
              </View>
              <Pressable
                onPress={() => handleDeletePartner(partner.id, partner.name)}
                hitSlop={8}
              >
                <X size={14} color={Colors.textMuted} />
              </Pressable>
            </View>
          </View>
        ))
      )}

      <Pressable
        style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        onPress={() => {
          Haptics.selectionAsync();
          setShowNewPartner(true);
        }}
        testID="add-partner"
      >
        <UserPlus size={18} color={Colors.primary} />
        <Text style={styles.addButtonText}>Add Partner</Text>
      </Pressable>
    </View>
  );

  const renderAlerts = () => (
    <View>
      {driftAlerts.length === 0 ? (
        <View style={styles.emptyState}>
          <ShieldCheck size={40} color={Colors.success} />
          <Text style={styles.emptyTitle}>All clear</Text>
          <Text style={styles.emptySubtext}>
            No behavioral drift detected. You're on track. Keep showing up.
          </Text>
        </View>
      ) : (
        driftAlerts.map(alert => {
          const borderColor = alert.severity === 'urgent' ? Colors.danger : alert.severity === 'moderate' ? Colors.accentWarm : Colors.textMuted;
          const iconColor = alert.severity === 'urgent' ? Colors.danger : alert.severity === 'moderate' ? Colors.accentWarm : Colors.primary;
          return (
            <View key={alert.id} style={[styles.alertCard, { borderLeftColor: borderColor }]} testID={`alert-${alert.id}`}>
              <View style={styles.alertHeader}>
                <AlertTriangle size={16} color={iconColor} />
                <Text style={styles.alertSeverity}>{alert.severity.toUpperCase()}</Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <View style={styles.alertSuggestionRow}>
                <MessageCircle size={12} color={Colors.textSecondary} />
                <Text style={styles.alertSuggestion}>{alert.suggestion}</Text>
              </View>
            </View>
          );
        })
      )}

      <View style={styles.preventionCard}>
        <View style={styles.preventionHeader}>
          <Zap size={16} color={Colors.accentWarm} />
          <Text style={styles.preventionTitle}>Relapse Prevention</Text>
        </View>
        <Text style={styles.preventionText}>
          {daysSober < 7
            ? "The first week is the hardest. Take it one hour at a time. You don't have to be perfect."
            : daysSober < 30
            ? "You're building new neural pathways. Cravings are normal — they're proof your brain is rewiring."
            : daysSober < 90
            ? "You've passed the acute phase. Watch for complacency. Stay connected, stay honest."
            : "You're in sustained recovery. Guard against overconfidence. Your commitments keep you grounded."}
        </Text>
      </View>
    </View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStrengthMeter()}
        {renderEncouragement()}
        {renderTabs()}

        {activeTab === 'contracts' && renderContracts()}
        {activeTab === 'partners' && (
          hasFeature('advanced_accountability') ? renderPartners() : (
            <View style={styles.premiumGateSection}>
              <View style={styles.premiumGateIconCircle}>
                <Users size={28} color="#D4A574" />
              </View>
              <Text style={styles.premiumGateTitle}>Accountability Partners</Text>
              <Text style={styles.premiumGateDesc}>
                Connect with trusted people who support your recovery journey.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.premiumGateBtn, pressed && { opacity: 0.8 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  require('expo-router').router.push('/premium-upgrade');
                }}
              >
                <Text style={styles.premiumGateBtnText}>Unlock Partners</Text>
              </Pressable>
            </View>
          )
        )}
        {activeTab === 'alerts' && (
          hasFeature('advanced_accountability') ? renderAlerts() : (
            <View style={styles.premiumGateSection}>
              <View style={styles.premiumGateIconCircle}>
                <Bell size={28} color="#D4A574" />
              </View>
              <Text style={styles.premiumGateTitle}>Behavioral Drift Alerts</Text>
              <Text style={styles.premiumGateDesc}>
                Get early warnings when patterns suggest you may need extra support.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.premiumGateBtn, pressed && { opacity: 0.8 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  require('expo-router').router.push('/premium-upgrade');
                }}
              >
                <Text style={styles.premiumGateBtnText}>Unlock Alerts</Text>
              </Pressable>
            </View>
          )
        )}
      </ScrollView>

      <Modal visible={showNewContract} animationType="slide" transparent testID="new-contract-modal">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Commitment</Text>
              <Pressable onPress={() => setShowNewContract(false)} hitSlop={8}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>A promise to yourself. Not a rule — a choice.</Text>

            <Text style={styles.inputLabel}>WHAT ARE YOU COMMITTING TO?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Stay sober today"
              placeholderTextColor={Colors.textMuted}
              value={contractTitle}
              onChangeText={setContractTitle}
              maxLength={60}
              testID="contract-title-input"
            />

            <Text style={styles.inputLabel}>WHY THIS MATTERS (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Your reason..."
              placeholderTextColor={Colors.textMuted}
              value={contractDesc}
              onChangeText={setContractDesc}
              multiline
              maxLength={200}
              testID="contract-desc-input"
            />

            <Text style={styles.inputLabel}>CATEGORY</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat.key}
                  style={[styles.categoryChip, contractCategory === cat.key && { backgroundColor: getCategoryColor(cat.key), borderColor: getCategoryColor(cat.key) }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setContractCategory(cat.key);
                  }}
                  testID={`cat-${cat.key}`}
                >
                  <Text style={[styles.categoryChipText, contractCategory === cat.key && { color: Colors.white }]}>{cat.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.createButton, pressed && { opacity: 0.85 }]}
              onPress={handleCreateContract}
              testID="create-contract"
            >
              <Text style={styles.createButtonText}>Create Commitment</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showCheckInModal} animationType="fade" transparent testID="checkin-modal">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daily Check-In</Text>
              <Pressable onPress={() => { setShowCheckInModal(false); setSelectedContractId(''); }} hitSlop={8}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>No judgment. Just honesty.</Text>

            <Text style={styles.inputLabel}>HOW DID IT GO? (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="A quick note..."
              placeholderTextColor={Colors.textMuted}
              value={checkInNote}
              onChangeText={setCheckInNote}
              multiline
              maxLength={150}
              testID="checkin-note-input"
            />

            <View style={styles.checkInActions}>
              <Pressable
                style={({ pressed }) => [styles.honorButton, pressed && { opacity: 0.85 }]}
                onPress={() => handleCheckIn(true)}
                testID="checkin-honored"
              >
                <Check size={18} color={Colors.white} />
                <Text style={styles.honorButtonText}>I honored it</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.slipButton, pressed && { opacity: 0.85 }]}
                onPress={() => handleCheckIn(false)}
                testID="checkin-slipped"
              >
                <Text style={styles.slipButtonText}>I slipped</Text>
              </Pressable>
            </View>
            <Text style={styles.slipNote}>Slipping doesn't erase your progress. Honesty is recovery.</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={showNewPartner} animationType="slide" transparent testID="new-partner-modal">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Partner</Text>
              <Pressable onPress={() => setShowNewPartner(false)} hitSlop={8}>
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>Someone who walks beside you, not above you.</Text>

            <Text style={styles.inputLabel}>NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Their name"
              placeholderTextColor={Colors.textMuted}
              value={partnerName}
              onChangeText={setPartnerName}
              maxLength={40}
              testID="partner-name-input"
            />

            <Text style={styles.inputLabel}>PHONE (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              placeholderTextColor={Colors.textMuted}
              value={partnerPhone}
              onChangeText={setPartnerPhone}
              keyboardType="phone-pad"
              maxLength={20}
              testID="partner-phone-input"
            />

            <Text style={styles.inputLabel}>RELATIONSHIP</Text>
            <View style={styles.categoryRow}>
              {RELATIONSHIP_OPTIONS.map(rel => (
                <Pressable
                  key={rel}
                  style={[styles.categoryChip, partnerRelationship === rel && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPartnerRelationship(rel);
                  }}
                  testID={`rel-${rel}`}
                >
                  <Text style={[styles.categoryChipText, partnerRelationship === rel && { color: Colors.white }]}>{rel}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.createButton, pressed && { opacity: 0.85 }]}
              onPress={handleAddPartner}
              testID="create-partner"
            >
              <Text style={styles.createButtonText}>Add Partner</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Animated.View>
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
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  strengthCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  strengthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  strengthTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  strengthPercent: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  strengthBarBg: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  strengthBarFill: {
    height: 6,
    borderRadius: 3,
  },
  strengthSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  encouragementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,179,71,0.08)',
    borderRadius: 12,
    marginBottom: 18,
  },
  encouragementText: {
    fontSize: 13,
    color: Colors.accentWarm,
    fontWeight: '500' as const,
    flex: 1,
    lineHeight: 18,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  tabBadge: {
    backgroundColor: Colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  contractCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  contractTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  contractInfo: {
    flex: 1,
  },
  contractTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  contractDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  contractStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
  },
  checkedInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(76,175,80,0.1)',
    borderRadius: 10,
  },
  checkedInText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  checkInButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  recentCheckins: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 10,
    justifyContent: 'center',
  },
  checkInDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    marginTop: 4,
    marginBottom: 12,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  protectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,179,71,0.08)',
    borderRadius: 12,
  },
  protectionText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.accentWarm,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 12,
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerInitial: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  partnerRole: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize' as const,
    marginTop: 1,
  },
  partnerPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  partnerPhone: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  partnerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  sharingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sharingBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.white,
    textTransform: 'capitalize' as const,
  },
  alertCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  alertSeverity: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  alertSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 4,
  },
  alertSuggestion: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    flex: 1,
  },
  preventionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  preventionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  preventionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  preventionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textTransform: 'capitalize' as const,
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  checkInActions: {
    gap: 10,
    marginBottom: 12,
  },
  honorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 14,
    paddingVertical: 16,
  },
  honorButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  slipButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  slipButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  slipNote: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  premiumGateSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  premiumGateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(212,165,116,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,165,116,0.2)',
  },
  premiumGateTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  premiumGateDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 20,
  },
  premiumGateBtn: {
    backgroundColor: 'rgba(212,165,116,0.15)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,165,116,0.3)',
  },
  premiumGateBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#D4A574',
  },
});
