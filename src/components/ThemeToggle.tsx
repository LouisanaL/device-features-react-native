import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const TRACK_WIDTH = 51;
const TRACK_HEIGHT = 31;
const THUMB_SIZE = 27;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - 4;

const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme, colors } = useTheme();
  const translateX = useRef(new Animated.Value(isDark ? THUMB_TRAVEL : 2)).current;
  const trackColor = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: isDark ? THUMB_TRAVEL : 2, useNativeDriver: true, tension: 120, friction: 10 }),
      Animated.timing(trackColor, { toValue: isDark ? 1 : 0, duration: 200, useNativeDriver: false }),
    ]).start();
  }, [isDark]);

  const animatedTrackBg = trackColor.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.toggleTrackOff, colors.primary],
  });

  return (
    <TouchableOpacity onPress={toggleTheme} activeOpacity={0.85} accessibilityRole="switch" accessibilityState={{ checked: isDark }}>
      <Animated.View style={[styles.track, { backgroundColor: animatedTrackBg }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]}>
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={15} color={isDark ? '#3A3A6E' : '#F5A623'} />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: { width: TRACK_WIDTH, height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 1 },
  thumb: { position: 'absolute', top: 2, width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.28, shadowRadius: 3, elevation: 4, justifyContent: 'center', alignItems: 'center' },
});

export default ThemeToggle;