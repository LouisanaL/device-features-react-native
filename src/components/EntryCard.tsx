// src/components/EntryCard.tsx

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  ActionSheetIOS,
  Platform,
  FlatList,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { notifyPhotoSavedToDevice, notifyMemoryDeleted } from '../utils/notifications';
import { TravelEntry } from '../types';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const IMAGE_HEIGHT = 240;
const CAPTION_BOTTOM = 36;

interface EntryCardProps {
  entry?: TravelEntry;
  group?: TravelEntry[];
  onRemove: (id: string) => void;
  newestEntryId?: string;
}

// ─── Shared menu ──────────────────────────────────────────────────────────────
const showEntryMenu = (
  entry: TravelEntry,
  onRemove: (id: string) => void,
  scaleAnim: Animated.Value,
  onDeleteFromGroup?: () => void
) => {
  const handleSaveToDevice = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo library access in Settings to save photos.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(entry.imageUri);
      notifyPhotoSavedToDevice().catch(() => {});
      Alert.alert('Saved!', 'Photo saved to your device gallery.');
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message ?? 'Could not save the photo.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to delete this travel memory? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            notifyMemoryDeleted().catch(() => {});
            if (onDeleteFromGroup) {
              onDeleteFromGroup();
            } else {
              Animated.timing(scaleAnim, { toValue: 0, duration: 250, useNativeDriver: true })
                .start(() => onRemove(entry.id));
            }
          },
        },
      ]
    );
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Save to Device', 'Delete'],
        cancelButtonIndex: 0,
        destructiveButtonIndex: 2,
        title: 'Memory Options',
      },
      (i) => { if (i === 1) handleSaveToDevice(); if (i === 2) handleDelete(); }
    );
  } else {
    Alert.alert('Memory Options', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save to Device', onPress: handleSaveToDevice },
      { text: 'Delete', style: 'destructive', onPress: handleDelete },
    ]);
  }
};

// ─── Caption overlay ──────────────────────────────────────────────────────────
const CaptionOverlay: React.FC<{ caption?: string }> = ({ caption }) => {
  if (!caption || caption.trim() === '') return null;
  return (
    <View style={styles.captionWrapper} pointerEvents="none">
      <View style={styles.captionPill}>
        <Text style={styles.captionText} numberOfLines={3}>
          {caption}
        </Text>
      </View>
    </View>
  );
};

// ─── Shared info block ────────────────────────────────────────────────────────
const InfoBlock: React.FC<{
  entry: TravelEntry;
  colors: any;
  counter?: string;
}> = ({ entry, colors, counter }) => {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

  return (
    <View style={styles.content}>
      <View style={styles.metaRow}>
        <View style={[styles.timePill, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="time-outline" size={13} color={colors.primaryDark} />
          <Text style={[styles.timeText, { color: colors.primaryDark }]}>
            {formatTime(entry.createdAt)}
          </Text>
        </View>
        {counter ? (
          <Text style={[styles.photoCounter, { color: colors.textMuted }]}>{counter}</Text>
        ) : null}
      </View>
      <Text style={[styles.fullDate, { color: colors.textMuted }]}>
        {formatDate(entry.createdAt)}
      </Text>
      <View style={styles.addressRow}>
        <Ionicons name="location" size={16} color={colors.primary} style={{ marginTop: 1 }} />
        <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={3}>
          {entry.address}
        </Text>
      </View>
    </View>
  );
};

// ─── Single Photo Card ────────────────────────────────────────────────────────
const SinglePhotoCard: React.FC<{
  entry: TravelEntry;
  onRemove: (id: string) => void;
  colors: any;
}> = ({ entry, onRemove, colors }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[styles.card, {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      transform: [{ scale: scaleAnim }],
    }]}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: entry.imageUri }} style={styles.image} resizeMode="cover" />
        <CaptionOverlay caption={entry.caption} />
        <TouchableOpacity
          onPress={() => showEntryMenu(entry, onRemove, scaleAnim)}
          style={styles.menuBtn}
          activeOpacity={0.75}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <InfoBlock entry={entry} colors={colors} />
      <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
    </Animated.View>
  );
};

// ─── Album Card ───────────────────────────────────────────────────────────────
const AlbumCard: React.FC<{
  group: TravelEntry[];
  onRemove: (id: string) => void;
  colors: any;
  newestEntryId?: string;
}> = ({ group: initialGroup, onRemove, colors, newestEntryId }) => {
  const [group, setGroup] = useState<TravelEntry[]>(initialGroup);
  const [activeIndex, setActiveIndex] = useState(0);
  const cardScaleAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList<TravelEntry>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const activeEntry = group[activeIndex] ?? group[0];

  // Sync local state when parent passes updated group (new photo added, or delete)
  useEffect(() => {
    setGroup(initialGroup);
    setActiveIndex((prev) => Math.min(prev, Math.max(0, initialGroup.length - 1)));
  }, [initialGroup]);

  // When a new entry is added, scroll to it
  useEffect(() => {
    if (!newestEntryId || initialGroup.length === 0) return;
    const targetIndex = initialGroup.findIndex((e) => e.id === newestEntryId);
    if (targetIndex < 0) return;
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: targetIndex, animated: true });
      setActiveIndex(targetIndex);
    }, 150);
  }, [newestEntryId, initialGroup]);

  const handleDeleteFromGroup = useCallback(
    (entry: TravelEntry) => {
      const remaining = group.filter((e) => e.id !== entry.id);
      notifyMemoryDeleted().catch(() => {});
      if (remaining.length === 0) {
        Animated.timing(cardScaleAnim, { toValue: 0, duration: 250, useNativeDriver: true })
          .start(() => onRemove(entry.id));
        return;
      }
      onRemove(entry.id);
      const newIndex = Math.max(0, activeIndex >= remaining.length ? remaining.length - 1 : activeIndex);
      setGroup(remaining);
      setActiveIndex(newIndex);
      setTimeout(() => flatListRef.current?.scrollToIndex({ index: newIndex, animated: false }), 50);
    },
    [group, activeIndex, cardScaleAnim, onRemove]
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderPage = useCallback(
    ({ item, index }: ListRenderItemInfo<TravelEntry>) => {
      const inputRange = [
        (index - 1) * CARD_WIDTH,
        index * CARD_WIDTH,
        (index + 1) * CARD_WIDTH,
      ];
      const rotate = scrollX.interpolate({
        inputRange, outputRange: ['6deg', '0deg', '-6deg'], extrapolate: 'clamp',
      });
      const scale = scrollX.interpolate({
        inputRange, outputRange: [0.95, 1, 0.95], extrapolate: 'clamp',
      });

      return (
        <Animated.View style={[styles.pageContainer, {
          transform: [{ perspective: 1200 }, { rotateY: rotate }, { scale }],
        }]}>
          <Image source={{ uri: item.imageUri }} style={styles.image} resizeMode="cover" />
          <CaptionOverlay caption={item.caption} />
          <View style={styles.curlHint} />
        </Animated.View>
      );
    },
    [scrollX]
  );

  if (group.length === 0) return null;

  return (
    <Animated.View style={[styles.card, {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      transform: [{ scale: cardScaleAnim }],
    }]}>
      {/* Album banner */}
      <View style={[styles.albumHeader, { backgroundColor: colors.primary }]}>
        <Ionicons name="images-outline" size={14} color={colors.textOnPrimary} />
        <Text style={[styles.albumHeaderText, { color: colors.textOnPrimary }]}>
          {group.length} photos · {new Date(group[0].createdAt).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
          })}
        </Text>
      </View>

      {/* Photo container */}
      <View style={styles.imageContainer}>
        {group.length > 2 && (
          <View style={[styles.stackPageBack, { backgroundColor: colors.border }]} />
        )}
        {group.length > 1 && (
          <View style={[styles.stackPageMid, { backgroundColor: colors.surfaceElevated }]} />
        )}

        {/* Swipeable FlatList */}
        <Animated.FlatList
          ref={flatListRef}
          data={group}
          renderItem={renderPage}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH}
          snapToAlignment="center"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: CARD_WIDTH, offset: CARD_WIDTH * index, index,
          })}
          style={styles.flatList}
        />

        {/* Dots — fixed, outside FlatList */}
        <View style={styles.dotsRow} pointerEvents="none">
          {group.map((_, i) => (
            <Animated.View
              key={i}
              style={[styles.dot, {
                backgroundColor: i === activeIndex ? colors.primary : 'rgba(255,255,255,0.6)',
                width: i === activeIndex ? 18 : 7,
              }]}
            />
          ))}
        </View>
      </View>

      {/* 3-dot menu — fixed, does NOT scroll */}
      <TouchableOpacity
        onPress={() => showEntryMenu(
          activeEntry, onRemove, cardScaleAnim,
          () => handleDeleteFromGroup(activeEntry)
        )}
        style={[styles.menuBtnAlbum, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
        activeOpacity={0.75}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      <InfoBlock
        entry={activeEntry}
        colors={colors}
        counter={`${activeIndex + 1} / ${group.length}`}
      />
      <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
    </Animated.View>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────
const EntryCard: React.FC<EntryCardProps> = ({ entry, group, onRemove, newestEntryId }) => {
  const { colors } = useTheme();

  if (group && group.length > 1) {
    return (
      <AlbumCard
        group={group}
        onRemove={onRemove}
        colors={colors}
        newestEntryId={newestEntryId}
      />
    );
  }

  const single = entry ?? group?.[0];
  if (!single) return null;
  return <SinglePhotoCard entry={single} onRemove={onRemove} colors={colors} />;
};

export default EntryCard;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'visible',
  },
  albumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
    overflow: 'hidden',
  },
  albumHeaderText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

  imageContainer: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  flatList: { width: CARD_WIDTH, height: IMAGE_HEIGHT },
  pageContainer: { width: CARD_WIDTH, height: IMAGE_HEIGHT, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },

  stackPageBack: {
    position: 'absolute', top: 5, left: 5, right: -5, bottom: -5,
    borderRadius: 6, zIndex: -2,
  },
  stackPageMid: {
    position: 'absolute', top: 2, left: 2, right: -2, bottom: -2,
    borderRadius: 4, zIndex: -1,
  },
  curlHint: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderTopLeftRadius: 26,
  },

  // Caption — light frosted pill, raised above dots
  captionWrapper: {
    position: 'absolute',
    bottom: CAPTION_BOTTOM,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  captionPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: CARD_WIDTH - 48,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    zIndex: 10,
  },
  dot: { height: 7, borderRadius: 3.5 },

  menuBtn: {
    position: 'absolute',
    top: 12, right: 12,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 20,
  },
  menuBtnAlbum: {
    position: 'absolute',
    top: 46, right: 12,
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 999, elevation: 20,
  },

  content: { padding: 16, gap: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  timeText: { fontSize: 13, fontWeight: '700' },
  photoCounter: { fontSize: 12, fontWeight: '600' },
  fullDate: { fontSize: 13, fontWeight: '500' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  addressText: { fontSize: 13, lineHeight: 19, flex: 1 },
  accentBar: {
    height: 4, width: '100%',
    borderBottomLeftRadius: 19, borderBottomRightRadius: 19,
  },
});