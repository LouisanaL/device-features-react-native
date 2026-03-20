// NOTE: setNotificationHandler is in App.tsx — not here.

import * as Notifications from 'expo-notifications';

export const requestNotificationPermission = async (): Promise<boolean> => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

const send = async (title: string, body: string): Promise<void> => {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch (err) {
    console.warn('Notification error:', err);
  }
};

export const notifyMemorySaved = (address: string): Promise<void> =>
  send('✈️ Memory Saved!', `Your travel memory at "${address}" has been added to your diary.`);

export const notifyPhotoSavedToDevice = (): Promise<void> =>
  send('🖼️ Photo Saved to Gallery', 'Your travel photo has been saved to your device gallery.');

export const notifyMemoryDeleted = (): Promise<void> =>
  send('🗑️ Memory Deleted', 'Your travel memory has been removed from your diary.');