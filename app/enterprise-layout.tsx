import React from 'react';
import { Stack } from 'expo-router';

import { EnterpriseProvider } from '@/providers/EnterpriseProvider';
import { ProviderModeProvider } from '@/providers/ProviderModeProvider';

export default function EnterpriseLayout() {
  return (
    <ProviderModeProvider>
      <EnterpriseProvider>
        <Stack
          screenOptions={{
            headerShown: true,
          }}
        />
      </EnterpriseProvider>
    </ProviderModeProvider>
  );
}

