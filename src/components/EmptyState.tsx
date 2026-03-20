import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const EmptyState: React.FC = () => {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY }] }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
        <Ionicons name="map-outline" size={48} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>No Memories Yet</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Tap the <Text style={[styles.plusHint, { color: colors.primary }]}>+</Text> button to capture your first travel memory.
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48, paddingBottom: 100, gap: 16 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  plusHint: { fontWeight: '900', fontSize: 18 },
});

export default EmptyState;