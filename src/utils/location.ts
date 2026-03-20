import * as Location from 'expo-location';

export interface LocationResult {
  address: string;
  latitude: number;
  longitude: number;
}

export const requestLocationPermission = async (): Promise<boolean> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

export const getCurrentLocation = async (): Promise<LocationResult> => {
  const granted = await requestLocationPermission();
  if (!granted) {
    throw new Error('Location permission denied. Please enable location access in Settings.');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const { latitude, longitude } = location.coords;
  const [geocoded] = await Location.reverseGeocodeAsync({ latitude, longitude });

  if (!geocoded) throw new Error('Unable to retrieve address for this location.');

  const parts = [geocoded.name, geocoded.street, geocoded.city, geocoded.region, geocoded.country].filter(Boolean);
  const address = parts.join(', ') || 'Unknown location';

  return { address, latitude, longitude };
};