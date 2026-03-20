import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { ThemeProvider } from './src/context/ThemeContext';
import { EntriesProvider } from './src/context/EntriesContext';
import AppNavigator from './src/navigation/AppNavigator';

// Must be at root level, before any notification is scheduled
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  useEffect(() => {
    // Request permission on app start so it's ready when needed
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <EntriesProvider>
            <AppNavigator />
          </EntriesProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </View>
  );
}