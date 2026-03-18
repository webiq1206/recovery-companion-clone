import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useRelapse } from '@/core/domains/useRelapse';
import RelapseResponseModal from '@/components/RelapseResponseModal';

/**
 * Renders the relapse response modal when the user has just logged a relapse.
 * On dismiss, redirects to Stability Builder (rebuild tab).
 */
export default function RelapseFlowGate() {
  const router = useRouter();
  const { showRelapseModal, dismissRelapseModal } = useRelapse();

  const handleDismiss = useCallback(() => {
    dismissRelapseModal();
  }, [dismissRelapseModal]);

  const handleContinueToStabilityBuilder = useCallback(() => {
    dismissRelapseModal();
    router.replace('/(tabs)/rebuild' as any);
  }, [dismissRelapseModal, router]);

  const handleCompleteEveningCheckIn = useCallback(() => {
    router.push('/daily-checkin' as any);
  }, [router]);

  const handleActivateSupport = useCallback(() => {
    router.push('/crisis-mode' as any);
  }, [router]);

  const handleIdentifyTriggerWindow = useCallback(() => {
    router.push('/relapse-recovery' as any);
  }, [router]);

  return (
    <RelapseResponseModal
      visible={showRelapseModal}
      onDismiss={handleDismiss}
      onContinueToStabilityBuilder={handleContinueToStabilityBuilder}
      onCompleteEveningCheckIn={handleCompleteEveningCheckIn}
      onActivateSupport={handleActivateSupport}
      onIdentifyTriggerWindow={handleIdentifyTriggerWindow}
    />
  );
}
