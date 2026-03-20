import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Animated,
  StatusBar, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import { getCurrentLocation } from '../utils/location';
import { notifyMemorySaved } from '../utils/notifications';
import { validateTravelEntry, generateEntryId } from '../utils/validation';
import usePermissions from '../hooks/usePermissions';
import ThemeToggle from '../components/ThemeToggle';

const AddEntryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { addEntry } = useEntries();
  const { requestCameraPermission } = usePermissions();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [caption, setCaption] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locationError, setLocationError] = useState('');

  const imageScaleAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const locationFadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      setImageUri(null); setAddress(''); setLatitude(0); setLongitude(0);
      setCaption(''); setLocationError(''); setIsLoadingLocation(false); setIsSaving(false);
      imageScaleAnim.setValue(0); locationFadeAnim.setValue(0);
    }, [])
  );

  const fetchLocation = async () => {
    setIsLoadingLocation(true); setLocationError(''); locationFadeAnim.setValue(0);
    try {
      const result = await getCurrentLocation();
      setAddress(result.address); setLatitude(result.latitude); setLongitude(result.longitude);
      Animated.timing(locationFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (error: any) {
      setLocationError(error?.message ?? 'Failed to get location. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleTakePhoto = async () => {
    const granted = await requestCameraPermission();
    if (!granted) { Alert.alert('Camera Permission Required', 'Please enable camera access in Settings to take photos.'); return; }
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.85 });
      if (!result.canceled && result.assets.length > 0 && result.assets[0].uri) {
        setImageUri(result.assets[0].uri);
        imageScaleAnim.setValue(0);
        Animated.spring(imageScaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
        await fetchLocation();
      }
    } catch { Alert.alert('Error', 'Failed to open camera. Please try again.'); }
  };

  const handleSave = async () => {
    const validation = validateTravelEntry({ imageUri, address });
    if (!validation.isValid) { Alert.alert('Cannot Save Entry', validation.errors.join('\n\n')); return; }

    Animated.sequence([
      Animated.timing(buttonScaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    setIsSaving(true);
    try {
      const newEntry = {
        id: generateEntryId(),
        imageUri: imageUri!,
        address: address.trim(),
        latitude, longitude,
        caption: caption.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      await addEntry(newEntry);
      notifyMemorySaved(address).catch(() => {});
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Save Failed', error?.message ?? 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveBtnDisabled = isSaving || isLoadingLocation || !imageUri || !address;
  const saveBtnLabel = !imageUri ? 'Take a Photo to Continue' : isLoadingLocation ? 'Getting Location...' : !address ? 'Waiting for Location...' : 'Save Memory';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]} accessibilityRole="button">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Memory</Text>
        <ThemeToggle />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Photo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PHOTO</Text>
            <Text style={[styles.required, { color: colors.danger }]}>* Required</Text>
          </View>
          {imageUri ? (
            <View style={{ gap: 12 }}>
              <Animated.View style={[styles.imageWrapper, { borderColor: colors.primary, transform: [{ scale: imageScaleAnim }] }]}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={17} color={colors.textOnPrimary} />
                </View>
              </Animated.View>
              <TouchableOpacity onPress={handleTakePhoto} style={[styles.retakeBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Ionicons name="camera-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.retakeBtnText, { color: colors.textSecondary }]}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleTakePhoto} style={[styles.photoPlaceholder, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }]} activeOpacity={0.75}>
              <View style={[styles.cameraIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="camera" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.placeholderTitle, { color: colors.text }]}>Take a Photo</Text>
              <Text style={[styles.placeholderSub, { color: colors.textMuted }]}>Tap to open your camera</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Caption */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CAPTION</Text>
            <View style={[styles.optionalTag, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.optionalText, { color: colors.textMuted }]}>Optional</Text>
            </View>
          </View>
          <View style={[styles.captionInputWrapper, { backgroundColor: colors.surface, borderColor: caption ? colors.primary : colors.border }]}>
            <TextInput value={caption} onChangeText={setCaption} placeholder="Write a note about this memory..." placeholderTextColor={colors.textMuted} style={[styles.captionInput, { color: colors.text }]} multiline maxLength={300} returnKeyType="done" blurOnSubmit />
            <Text style={[styles.charCount, { color: colors.textMuted }]}>{caption.length}/300</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>LOCATION</Text>
            <Text style={[styles.autoTag, { color: colors.primary }]}>Auto-detected</Text>
          </View>
          <View style={[styles.locationCard, { backgroundColor: colors.surface, borderColor: locationError ? colors.danger : address ? colors.primary : colors.border }]}>
            {isLoadingLocation ? (
              <View style={styles.locationRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.locationLoadingText, { color: colors.textMuted }]}>Detecting your location...</Text>
              </View>
            ) : address ? (
              <Animated.View style={[styles.locationRow, { opacity: locationFadeAnim }]}>
                <Ionicons name="location" size={20} color={colors.primary} />
                <Text style={[styles.locationAddress, { color: colors.text }]} numberOfLines={3}>{address}</Text>
              </Animated.View>
            ) : (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={20} color={locationError ? colors.danger : colors.textMuted} />
                <Text style={[styles.locationEmpty, { color: locationError ? colors.danger : colors.textMuted }]}>
                  {locationError || 'Location will be detected automatically after you take a photo.'}
                </Text>
              </View>
            )}
          </View>
          {locationError ? (
            <TouchableOpacity onPress={fetchLocation} style={[styles.retryBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Ionicons name="refresh" size={14} color={colors.primaryDark} />
              <Text style={[styles.retryText, { color: colors.primaryDark }]}>Retry Location</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Summary */}
        {imageUri && address ? (
          <View style={[styles.summaryCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <View style={styles.summaryTitleRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primaryDark} />
              <Text style={[styles.summaryTitle, { color: colors.primaryDark }]}>Ready to Save</Text>
            </View>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              Your memory will be saved with the photo{caption ? ', your note,' : ''} and location. You will receive a notification once saved.
            </Text>
          </View>
        ) : null}

        {/* Save */}
        <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
          <TouchableOpacity onPress={handleSave} disabled={saveBtnDisabled} style={[styles.saveBtn, { backgroundColor: saveBtnDisabled ? colors.border : colors.primary, shadowColor: colors.primaryDark }]} activeOpacity={0.85}>
            {isSaving ? (
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
            ) : (
              <View style={styles.saveBtnInner}>
                <Ionicons name="save-outline" size={19} color={saveBtnDisabled ? colors.textMuted : colors.textOnPrimary} />
                <Text style={[styles.saveBtnText, { color: saveBtnDisabled ? colors.textMuted : colors.textOnPrimary }]}>{saveBtnLabel}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 22 },
  section: { marginBottom: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  required: { fontSize: 11, fontWeight: '600' },
  optionalTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  optionalText: { fontSize: 10, fontWeight: '600' },
  autoTag: { fontSize: 11, fontWeight: '700' },
  photoPlaceholder: { borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', height: 210, justifyContent: 'center', alignItems: 'center', gap: 10 },
  cameraIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  placeholderTitle: { fontSize: 16, fontWeight: '800' },
  placeholderSub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  imageWrapper: { borderRadius: 16, borderWidth: 2.5, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: 230 },
  checkBadge: { position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  retakeBtn: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 22, borderWidth: 1 },
  retakeBtnText: { fontSize: 13, fontWeight: '700' },
  captionInputWrapper: { borderRadius: 14, borderWidth: 1.5, padding: 14, minHeight: 90 },
  captionInput: { fontSize: 14, lineHeight: 20, minHeight: 60, textAlignVertical: 'top' },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 6 },
  locationCard: { borderRadius: 14, borderWidth: 1.5, padding: 16, minHeight: 70, justifyContent: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationLoadingText: { fontSize: 14 },
  locationAddress: { fontSize: 14, lineHeight: 20, flex: 1, fontWeight: '600' },
  locationEmpty: { fontSize: 13, flex: 1, lineHeight: 18 },
  retryBtn: { alignSelf: 'flex-start', marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  retryText: { fontSize: 13, fontWeight: '700' },
  summaryCard: { borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 18, gap: 8 },
  summaryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryTitle: { fontSize: 14, fontWeight: '800' },
  summaryText: { fontSize: 13, lineHeight: 19 },
  saveBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  saveBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});

export default AddEntryScreen;