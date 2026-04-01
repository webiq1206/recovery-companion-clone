import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ChevronRight, Phone } from 'lucide-react-native';

import { crisisStyles, CRISIS_COLORS } from './styles';
import type { EmergencyContact } from '@/types';

export function CrisisConnectStep(props: {
  emergencyContacts: EmergencyContact[];
  onCallContact: (phone: string) => void;
  onTextContact: (phone: string) => void;
  onClose: () => void;
}) {
  const { emergencyContacts, onCallContact, onTextContact, onClose } = props;

  return (
    <View style={crisisStyles.connectStepOuter}>
      <Text style={crisisStyles.stepLabel}>Reach Out</Text>
      <Text style={crisisStyles.stepHint}>You don't have to do this alone</Text>

      <ScrollView
        style={crisisStyles.connectScroll}
        contentContainerStyle={crisisStyles.connectScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {emergencyContacts.length > 0 ? (
          <>
            <Text style={crisisStyles.connectSectionLabel}>YOUR CONTACTS</Text>
            {emergencyContacts.map((contact) => (
              <View key={contact.id} style={crisisStyles.connectCard}>
                <View style={crisisStyles.connectAvatar}>
                  <Text style={crisisStyles.connectAvatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={crisisStyles.connectInfo}>
                  <Text style={crisisStyles.connectName}>{contact.name}</Text>
                  <Text style={crisisStyles.connectPhone}>{contact.phone}</Text>
                </View>
                <View style={crisisStyles.connectActions}>
                  <Pressable
                    style={({ pressed }) => [crisisStyles.connectCallBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => onCallContact(contact.phone)}
                    testID={`crisis-call-${contact.id}`}
                  >
                    <Phone size={22} color="#FFFFFF" />
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [crisisStyles.connectTextBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => onTextContact(contact.phone)}
                    testID={`crisis-text-${contact.id}`}
                  >
                    <Text style={crisisStyles.connectTextBtnLabel}>Text</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={crisisStyles.noContactsCard}>
            <Text style={crisisStyles.noContactsText}>
              Add trusted people under Connection, Trusted Circle, so you can reach them quickly
              during moments like this.
            </Text>
          </View>
        )}

        <Text style={[crisisStyles.connectSectionLabel, { marginTop: 16 }]}>CRISIS LINES</Text>
        <Pressable
          style={({ pressed }) => [crisisStyles.crisisLineCard, pressed && { opacity: 0.8 }]}
          onPress={() => onCallContact('988')}
          testID="crisis-call-988"
        >
          <View style={[crisisStyles.crisisLineIcon, { backgroundColor: '#EF535020' }]}>
            <Phone size={22} color="#EF5350" />
          </View>
          <View style={crisisStyles.crisisLineInfo}>
            <Text style={crisisStyles.crisisLineName}>988 Crisis Lifeline</Text>
            <Text style={crisisStyles.crisisLineAvail}>24/7 · Call or Text</Text>
          </View>
          <ChevronRight size={18} color={CRISIS_COLORS.MUTED} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [crisisStyles.crisisLineCard, pressed && { opacity: 0.8 }]}
          onPress={() => onCallContact('1-800-662-4357')}
          testID="crisis-call-samhsa"
        >
          <View style={[crisisStyles.crisisLineIcon, { backgroundColor: CRISIS_COLORS.ACCENT + '20' }]}>
            <Phone size={22} color={CRISIS_COLORS.ACCENT} />
          </View>
          <View style={crisisStyles.crisisLineInfo}>
            <Text style={crisisStyles.crisisLineName}>SAMHSA Helpline</Text>
            <Text style={crisisStyles.crisisLineAvail}>24/7 · 1-800-662-4357</Text>
          </View>
          <ChevronRight size={18} color={CRISIS_COLORS.MUTED} />
        </Pressable>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [crisisStyles.doneButtonConnect, pressed && { opacity: 0.9 }]}
        onPress={onClose}
        testID="crisis-done"
      >
        <Text style={crisisStyles.doneButtonText}>I'm feeling better</Text>
      </Pressable>
    </View>
  );
}
