import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform, AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import {
  SecuritySettings,
  SecurityState,
  AuditLogEntry,
  AuditAction,
  AnonymizedEvent,
  AuthMethod,
  SecurityLevel,
} from '@/types';
import {
  storePIN,
  verifyPIN,
  hasPIN,
  removePIN,
  generateSessionId,
  hashData,
  secureSetJSON,
  secureGetJSON,
} from '@/utils/secureStorage';

const STORAGE_KEYS = {
  SECURITY_SETTINGS: 'ro_security_settings',
  AUDIT_LOG: 'ro_audit_log',
  ANALYTICS_EVENTS: 'ro_analytics_events',
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;
const MAX_AUDIT_LOG_SIZE = 500;
const MAX_ANALYTICS_EVENTS = 1000;

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  isAuthEnabled: false,
  authMethod: 'none',
  biometricEnabled: false,
  autoLockTimeout: 300000,
  securityLevel: 'standard',
  dataEncryptionEnabled: true,
  auditLoggingEnabled: true,
  anonymizedAnalyticsEnabled: true,
  screenCaptureBlocked: false,
  lastAuthAt: '',
  failedAttempts: 0,
  lockoutUntil: '',
};

async function checkBiometricAvailability(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }

  try {
    const LocalAuth = require('expo-local-authentication');
    const hasHardware = await LocalAuth.hasHardwareAsync();
    const isEnrolled = await LocalAuth.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch (error) {
    console.log('[Security] Biometric check failed:', error);
    return false;
  }
}

async function authenticateWithBiometric(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }

  try {
    const LocalAuth = require('expo-local-authentication');
    const result = await LocalAuth.authenticateAsync({
      promptMessage: 'Verify your identity',
      cancelLabel: 'Use PIN',
      disableDeviceFallback: true,
    });
    return result.success;
  } catch (error) {
    console.log('[Security] Biometric auth failed:', error);
    return false;
  }
}

export const [SecurityProvider, useSecurity] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnonymizedEvent[]>([]);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const settingsQuery = useQuery({
    queryKey: ['security_settings'],
    queryFn: async () => {
      const stored = await secureGetJSON<SecuritySettings>(STORAGE_KEYS.SECURITY_SETTINGS);
      return stored ?? DEFAULT_SECURITY_SETTINGS;
    },
  });

  const auditQuery = useQuery({
    queryKey: ['audit_log'],
    queryFn: async () => {
      const stored = await secureGetJSON<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOG);
      return stored ?? [];
    },
  });

  const analyticsQuery = useQuery({
    queryKey: ['analytics_events'],
    queryFn: async () => {
      const stored = await secureGetJSON<AnonymizedEvent[]>(STORAGE_KEYS.ANALYTICS_EVENTS);
      return stored ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { settings: SecuritySettings; audit: AuditLogEntry[]; analytics: AnonymizedEvent[] }) => {
      await Promise.all([
        secureSetJSON(STORAGE_KEYS.SECURITY_SETTINGS, data.settings),
        secureSetJSON(STORAGE_KEYS.AUDIT_LOG, data.audit.slice(-MAX_AUDIT_LOG_SIZE)),
        secureSetJSON(STORAGE_KEYS.ANALYTICS_EVENTS, data.analytics.slice(-MAX_ANALYTICS_EVENTS)),
      ]);
      return data;
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
      if (settingsQuery.data.isAuthEnabled) {
        setIsAuthenticated(false);
        setIsLocked(true);
      }
    }
    if (auditQuery.data) setAuditLog(auditQuery.data);
    if (analyticsQuery.data) setAnalyticsEvents(analyticsQuery.data);
  }, [settingsQuery.data, auditQuery.data, analyticsQuery.data]);

  useEffect(() => {
    checkBiometricAvailability().then(setBiometricAvailable);
    generateSessionId().then(setSessionId);
    setIsInitialized(true);
    console.log('[Security] Provider initialized');
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && settings.isAuthEnabled) {
        const now = Date.now();
        const timeout = settings.autoLockTimeout;
        AsyncStorage.setItem('ro_background_time', now.toString());
        console.log('[Security] App backgrounded, lock timer started');
      }
      if (nextAppState === 'active' && settings.isAuthEnabled && isAuthenticated) {
        AsyncStorage.getItem('ro_background_time').then((bgTime) => {
          if (bgTime) {
            const elapsed = Date.now() - parseInt(bgTime, 10);
            if (elapsed > settings.autoLockTimeout) {
              setIsAuthenticated(false);
              setIsLocked(true);
              console.log('[Security] Auto-locked after timeout');
            }
          }
        });
      }
    });
    return () => subscription.remove();
  }, [settings.isAuthEnabled, settings.autoLockTimeout, isAuthenticated]);

  const persistAll = useCallback((newSettings: SecuritySettings, newAudit: AuditLogEntry[], newAnalytics: AnonymizedEvent[]) => {
    saveMutation.mutate({ settings: newSettings, audit: newAudit, analytics: newAnalytics });
  }, [saveMutation]);

  const addAuditEntry = useCallback((action: AuditAction, details: string, success: boolean) => {
    if (!settings.auditLoggingEnabled) return;
    const entry: AuditLogEntry = {
      id: Crypto.randomUUID(),
      action,
      timestamp: new Date().toISOString(),
      details,
      ipHash: 'local_device',
      sessionId,
      success,
    };
    setAuditLog(prev => {
      const updated = [...prev, entry].slice(-MAX_AUDIT_LOG_SIZE);
      return updated;
    });
    console.log('[Audit]', action, success ? 'SUCCESS' : 'FAILURE', details);
    return entry;
  }, [settings.auditLoggingEnabled, sessionId]);

  const trackEvent = useCallback((category: AnonymizedEvent['category'], action: string, metadata: Record<string, string | number | boolean> = {}) => {
    if (!settings.anonymizedAnalyticsEnabled) return;
    const event: AnonymizedEvent = {
      id: Crypto.randomUUID(),
      category,
      action,
      timestamp: new Date().toISOString(),
      metadata,
    };
    setAnalyticsEvents(prev => {
      const updated = [...prev, event].slice(-MAX_ANALYTICS_EVENTS);
      return updated;
    });
  }, [settings.anonymizedAnalyticsEnabled]);

  const authenticateWithPIN = useCallback(async (pin: string): Promise<boolean> => {
    if (settings.lockoutUntil) {
      const lockoutEnd = new Date(settings.lockoutUntil).getTime();
      if (Date.now() < lockoutEnd) {
        const remainingSec = Math.ceil((lockoutEnd - Date.now()) / 1000);
        console.log('[Security] Account locked out for', remainingSec, 'more seconds');
        return false;
      }
    }

    const isValid = await verifyPIN(pin);
    if (isValid) {
      const newSettings = {
        ...settings,
        failedAttempts: 0,
        lockoutUntil: '',
        lastAuthAt: new Date().toISOString(),
      };
      setSettings(newSettings);
      setIsAuthenticated(true);
      setIsLocked(false);
      addAuditEntry('auth_success', 'PIN authentication successful', true);
      trackEvent('session', 'auth_success', { method: 'pin' });
      const newSession = await generateSessionId();
      setSessionId(newSession);
      persistAll(newSettings, auditLog, analyticsEvents);
      return true;
    } else {
      const newAttempts = settings.failedAttempts + 1;
      const isLockedOut = newAttempts >= MAX_FAILED_ATTEMPTS;
      const newSettings = {
        ...settings,
        failedAttempts: newAttempts,
        lockoutUntil: isLockedOut ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString() : settings.lockoutUntil,
      };
      setSettings(newSettings);
      addAuditEntry('auth_failure', `PIN attempt ${newAttempts}/${MAX_FAILED_ATTEMPTS}`, false);
      if (isLockedOut) {
        addAuditEntry('auth_lockout', 'Account locked due to failed attempts', false);
        trackEvent('session', 'auth_lockout', { attempts: newAttempts });
      }
      persistAll(newSettings, auditLog, analyticsEvents);
      return false;
    }
  }, [settings, addAuditEntry, trackEvent, persistAll, auditLog, analyticsEvents]);

  const authenticateBiometric = useCallback(async (): Promise<boolean> => {
    if (!biometricAvailable || !settings.biometricEnabled) return false;

    const success = await authenticateWithBiometric();
    if (success) {
      const newSettings = {
        ...settings,
        failedAttempts: 0,
        lockoutUntil: '',
        lastAuthAt: new Date().toISOString(),
      };
      setSettings(newSettings);
      setIsAuthenticated(true);
      setIsLocked(false);
      addAuditEntry('auth_success', 'Biometric authentication successful', true);
      trackEvent('session', 'auth_success', { method: 'biometric' });
      const newSession = await generateSessionId();
      setSessionId(newSession);
      persistAll(newSettings, auditLog, analyticsEvents);
      return true;
    }
    addAuditEntry('auth_failure', 'Biometric authentication failed', false);
    return false;
  }, [biometricAvailable, settings, addAuditEntry, trackEvent, persistAll, auditLog, analyticsEvents]);

  const setupPIN = useCallback(async (pin: string): Promise<void> => {
    await storePIN(pin);
    const newSettings = {
      ...settings,
      isAuthEnabled: true,
      authMethod: 'pin' as AuthMethod,
      lastAuthAt: new Date().toISOString(),
    };
    setSettings(newSettings);
    setIsAuthenticated(true);
    setIsLocked(false);
    addAuditEntry('pin_change', 'PIN created', true);
    persistAll(newSettings, auditLog, analyticsEvents);
    console.log('[Security] PIN setup complete');
  }, [settings, addAuditEntry, persistAll, auditLog, analyticsEvents]);

  const changePIN = useCallback(async (currentPin: string, newPin: string): Promise<boolean> => {
    const isValid = await verifyPIN(currentPin);
    if (!isValid) {
      addAuditEntry('pin_change', 'PIN change failed - invalid current PIN', false);
      return false;
    }
    await storePIN(newPin);
    addAuditEntry('pin_change', 'PIN changed successfully', true);
    persistAll(settings, auditLog, analyticsEvents);
    return true;
  }, [settings, addAuditEntry, persistAll, auditLog, analyticsEvents]);

  const disableAuth = useCallback(async (pin: string): Promise<boolean> => {
    const isValid = await verifyPIN(pin);
    if (!isValid) return false;
    await removePIN();
    const newSettings = {
      ...settings,
      isAuthEnabled: false,
      authMethod: 'none' as AuthMethod,
      biometricEnabled: false,
      failedAttempts: 0,
      lockoutUntil: '',
    };
    setSettings(newSettings);
    setIsAuthenticated(true);
    setIsLocked(false);
    addAuditEntry('settings_change', 'Authentication disabled', true);
    persistAll(newSettings, auditLog, analyticsEvents);
    return true;
  }, [settings, addAuditEntry, persistAll, auditLog, analyticsEvents]);

  const toggleBiometric = useCallback(async (enabled: boolean): Promise<void> => {
    const newSettings = { ...settings, biometricEnabled: enabled };
    setSettings(newSettings);
    addAuditEntry('biometric_toggle', `Biometric ${enabled ? 'enabled' : 'disabled'}`, true);
    persistAll(newSettings, auditLog, analyticsEvents);
  }, [settings, addAuditEntry, persistAll, auditLog, analyticsEvents]);

  const updateSecurityLevel = useCallback((level: SecurityLevel) => {
    const newSettings = { ...settings, securityLevel: level };
    if (level === 'maximum') {
      newSettings.autoLockTimeout = 60000;
      newSettings.screenCaptureBlocked = true;
    } else if (level === 'enhanced') {
      newSettings.autoLockTimeout = 180000;
      newSettings.screenCaptureBlocked = false;
    } else {
      newSettings.autoLockTimeout = 300000;
      newSettings.screenCaptureBlocked = false;
    }
    setSettings(newSettings);
    addAuditEntry('settings_change', `Security level changed to ${level}`, true);
    persistAll(newSettings, auditLog, analyticsEvents);
  }, [settings, addAuditEntry, persistAll, auditLog, analyticsEvents]);

  const toggleEncryption = useCallback((enabled: boolean) => {
    const newSettings = { ...settings, dataEncryptionEnabled: enabled };
    setSettings(newSettings);
    addAuditEntry('encryption_toggle', `Encryption ${enabled ? 'enabled' : 'disabled'}`, true);
    persistAll(newSettings, auditLog, analyticsEvents);
  }, [settings, addAuditEntry, persistAll, auditLog, analyticsEvents]);

  const toggleAuditLogging = useCallback((enabled: boolean) => {
    const newSettings = { ...settings, auditLoggingEnabled: enabled };
    setSettings(newSettings);
    persistAll(newSettings, auditLog, analyticsEvents);
  }, [settings, persistAll, auditLog, analyticsEvents]);

  const toggleAnalytics = useCallback((enabled: boolean) => {
    const newSettings = { ...settings, anonymizedAnalyticsEnabled: enabled };
    setSettings(newSettings);
    addAuditEntry('settings_change', `Anonymized analytics ${enabled ? 'enabled' : 'disabled'}`, true);
    persistAll(newSettings, auditLog, analyticsEvents);
  }, [settings, addAuditEntry, persistAll, auditLog, analyticsEvents]);

  const lockApp = useCallback(() => {
    if (settings.isAuthEnabled) {
      setIsAuthenticated(false);
      setIsLocked(true);
      addAuditEntry('session_end', 'App locked manually', true);
      console.log('[Security] App locked manually');
    }
  }, [settings.isAuthEnabled, addAuditEntry]);

  const clearAuditLog = useCallback(() => {
    setAuditLog([]);
    secureSetJSON(STORAGE_KEYS.AUDIT_LOG, []);
    addAuditEntry('data_delete', 'Audit log cleared', true);
  }, [addAuditEntry]);

  const clearAnalytics = useCallback(() => {
    setAnalyticsEvents([]);
    secureSetJSON(STORAGE_KEYS.ANALYTICS_EVENTS, []);
    addAuditEntry('data_delete', 'Analytics events cleared', true);
  }, [addAuditEntry]);

  const getSecuritySummary = useMemo(() => {
    const totalAuditEntries = auditLog.length;
    const recentFailures = auditLog.filter(
      e => e.action === 'auth_failure' && new Date(e.timestamp).getTime() > Date.now() - 86400000
    ).length;
    const lastAuth = settings.lastAuthAt ? new Date(settings.lastAuthAt) : null;
    const isLockoutActive = settings.lockoutUntil ? new Date(settings.lockoutUntil).getTime() > Date.now() : false;

    return {
      totalAuditEntries,
      recentFailures,
      lastAuth,
      isLockoutActive,
      encryptionActive: settings.dataEncryptionEnabled,
      authEnabled: settings.isAuthEnabled,
      biometricEnabled: settings.biometricEnabled && biometricAvailable,
      securityLevel: settings.securityLevel,
      totalAnalyticsEvents: analyticsEvents.length,
    };
  }, [auditLog, analyticsEvents, settings, biometricAvailable]);

  const remainingLockoutSeconds = useMemo(() => {
    if (!settings.lockoutUntil) return 0;
    const remaining = new Date(settings.lockoutUntil).getTime() - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));
  }, [settings.lockoutUntil]);

  return useMemo(() => ({
    settings,
    isAuthenticated,
    isLocked,
    sessionId,
    auditLog,
    analyticsEvents,
    biometricAvailable,
    isInitialized,
    isLoading: settingsQuery.isLoading,
    remainingLockoutSeconds,
    securitySummary: getSecuritySummary,
    authenticateWithPIN,
    authenticateBiometric,
    setupPIN,
    changePIN,
    disableAuth,
    toggleBiometric,
    updateSecurityLevel,
    toggleEncryption,
    toggleAuditLogging,
    toggleAnalytics,
    lockApp,
    addAuditEntry,
    trackEvent,
    clearAuditLog,
    clearAnalytics,
  }), [
    settings, isAuthenticated, isLocked, sessionId, auditLog, analyticsEvents,
    biometricAvailable, isInitialized, settingsQuery.isLoading, remainingLockoutSeconds,
    getSecuritySummary, authenticateWithPIN, authenticateBiometric, setupPIN,
    changePIN, disableAuth, toggleBiometric, updateSecurityLevel, toggleEncryption,
    toggleAuditLogging, toggleAnalytics, lockApp, addAuditEntry, trackEvent,
    clearAuditLog, clearAnalytics,
  ]);
});
