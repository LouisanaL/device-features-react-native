import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export interface UsePermissionsReturn {
  requestCameraPermission: () => Promise<boolean>;
  requestMediaLibraryPermission: () => Promise<boolean>;
  requestLocationPermission: () => Promise<boolean>;
  requestNotificationPermission: () => Promise<boolean>;
  requestAllPermissions: () => Promise<void>;
}

const usePermissions = (): UsePermissionsReturn => {
  const requestCameraPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  }, []);

  const requestMediaLibraryPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  }, []);

  const requestLocationPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }, []);

  const requestAllPermissions = useCallback(async () => {
    await Promise.allSettled([
      requestCameraPermission(),
      requestMediaLibraryPermission(),
      requestLocationPermission(),
      requestNotificationPermission(),
    ]);
  }, [requestCameraPermission, requestMediaLibraryPermission, requestLocationPermission, requestNotificationPermission]);

  return {
    requestCameraPermission,
    requestMediaLibraryPermission,
    requestLocationPermission,
    requestNotificationPermission,
    requestAllPermissions,
  };
};

export default usePermissions;