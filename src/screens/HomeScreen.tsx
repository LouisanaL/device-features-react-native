// src/screens/HomeScreen.tsx

import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet, Text,
  StatusBar, TextInput, Animated, Modal, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, TravelEntry } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import EntryCard from '../components/EntryCard';
import EmptyState from '../components/EmptyState';
import ThemeToggle from '../components/ThemeToggle';
import LoadingSpinner from '../components/LoadingSpinner';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type DayGroup = {
  dateKey: string;
  entries: TravelEntry[];
  newestEntryId: string;
};

const getLocalDateKey = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── No Results state ─────────────────────────────────────────────────────────
const NoResults: React.FC<{ query: string; isDate: boolean; colors: any }> = ({ query, isDate, colors }) => (
  <View style={noResultStyles.container}>
    <View style={[noResultStyles.iconCircle, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
      <Ionicons name={isDate ? 'calendar-outline' : 'search-outline'} size={40} color={colors.primary} />
    </View>
    <Text style={[noResultStyles.title, { color: colors.text }]}>No Memories Found</Text>
    <Text style={[noResultStyles.subtitle, { color: colors.textMuted }]}>
      {isDate
        ? `No travel memories were recorded on ${query}.`
        : `No memories match the location "${query}".`}
    </Text>
    <Text style={[noResultStyles.hint, { color: colors.textMuted }]}>
      Try a different {isDate ? 'date' : 'location'}.
    </Text>
  </View>
);

const noResultStyles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 48, paddingBottom: 80, gap: 12,
  },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  hint: { fontSize: 12, textAlign: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavProp>();
  const { colors, isDark } = useTheme();
  const { entries, removeEntry, isLoading } = useEntries();

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterDay, setFilterDay] = useState('');

  const searchBarHeight = useRef(new Animated.Value(0)).current;
  const searchBarOpacity = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  const toggleSearch = () => {
    if (searchVisible) {
      Animated.parallel([
        Animated.timing(searchBarHeight, { toValue: 0, duration: 220, useNativeDriver: false }),
        Animated.timing(searchBarOpacity, { toValue: 0, duration: 180, useNativeDriver: false }),
      ]).start(() => { setSearchVisible(false); setSearchQuery(''); });
    } else {
      setSearchVisible(true);
      Animated.parallel([
        Animated.timing(searchBarHeight, { toValue: 52, duration: 220, useNativeDriver: false }),
        Animated.timing(searchBarOpacity, { toValue: 1, duration: 240, useNativeDriver: false }),
      ]).start(() => searchInputRef.current?.focus());
    }
  };

  const clearFilter = () => {
    setFilterYear(null); setFilterMonth(null); setFilterDay('');
  };

  const hasFilter = filterYear !== null || filterMonth !== null || filterDay.trim() !== '';
  const hasSearch = searchQuery.trim().length > 0;
  const isFiltering = hasFilter || hasSearch;

  const filterLabel = useMemo(() => {
    if (!hasFilter) return null;
    const parts: string[] = [];
    if (filterMonth !== null) parts.push(MONTHS[filterMonth]);
    if (filterDay.trim()) parts.push(filterDay.trim());
    if (filterYear !== null) parts.push(String(filterYear));
    return parts.join(' ');
  }, [filterYear, filterMonth, filterDay, hasFilter]);

  const handleRemove = useCallback(
    async (id: string) => { await removeEntry(id); }, [removeEntry]
  );

  const dayGroups = useMemo<DayGroup[]>(() => {
    let filtered = entries;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((e) =>
        e.address.toLowerCase().includes(q) ||
        (e.caption && e.caption.toLowerCase().includes(q))
      );
    }

    if (hasFilter) {
      filtered = filtered.filter((e) => {
        const d = new Date(e.createdAt);
        if (filterYear !== null && d.getFullYear() !== filterYear) return false;
        if (filterMonth !== null && d.getMonth() !== filterMonth) return false;
        if (filterDay.trim()) {
          const dayNum = parseInt(filterDay.trim(), 10);
          if (!isNaN(dayNum) && d.getDate() !== dayNum) return false;
        }
        return true;
      });
    }

    const map = new Map<string, TravelEntry[]>();
    for (const entry of filtered) {
      const key = getLocalDateKey(entry.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }

    return Array.from(map.entries())
      .map(([dateKey, dayEntries]) => {
        const sorted = [...dayEntries].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return { dateKey, entries: sorted, newestEntryId: sorted[sorted.length - 1].id };
      })
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [entries, searchQuery, filterYear, filterMonth, filterDay, hasFilter]);

  const renderGroup = useCallback(({ item }: { item: DayGroup }) => {
    if (item.entries.length === 1) return <EntryCard entry={item.entries[0]} onRemove={handleRemove} />;
    return <EntryCard group={item.entries} onRemove={handleRemove} newestEntryId={item.newestEntryId} />;
  }, [handleRemove]);

  const keyExtractor = useCallback(
    (item: DayGroup) => `${item.dateKey}-${item.entries.length}`, []
  );

  const availableYears = useMemo(() => {
    const years = new Set(entries.map((e) => new Date(e.createdAt).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [entries]);

  const searchResultLabel = useMemo(() => {
    if (!isFiltering) return null;
    const total = dayGroups.reduce((acc, g) => acc + g.entries.length, 0);
    return total === 0 ? null : `${total} ${total === 1 ? 'result' : 'results'}`;
  }, [isFiltering, dayGroups]);

  if (isLoading) return <LoadingSpinner message="Loading your travel diary..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Travel Diary</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.countText, { color: colors.primaryDark }]}>
              {entries.length} {entries.length === 1 ? 'memory' : 'memories'}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setFilterVisible(true)}
            style={[styles.iconBtn, { backgroundColor: hasFilter ? colors.primary : colors.surfaceElevated }]}
            activeOpacity={0.75}
          >
            <Ionicons name="calendar-outline" size={19} color={hasFilter ? colors.textOnPrimary : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleSearch}
            style={[styles.iconBtn, { backgroundColor: searchVisible ? colors.primary : colors.surfaceElevated }]}
            activeOpacity={0.75}
          >
            <Ionicons name={searchVisible ? 'close' : 'search'} size={19} color={searchVisible ? colors.textOnPrimary : colors.textSecondary} />
          </TouchableOpacity>
          <ThemeToggle />
        </View>
      </View>

      {/* Animated search bar */}
      <Animated.View style={[styles.searchBarContainer, { height: searchBarHeight, opacity: searchBarOpacity, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by location or caption..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && Platform.OS === 'android' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Active filter + result chips */}
      {(hasFilter || searchResultLabel) ? (
        <View style={[styles.chipRow, { borderBottomColor: colors.border }]}>
          {hasFilter && (
            <TouchableOpacity onPress={clearFilter} style={[styles.chip, { backgroundColor: colors.primary }]}>
              <Ionicons name="calendar" size={12} color={colors.textOnPrimary} />
              <Text style={[styles.chipText, { color: colors.textOnPrimary }]}>{filterLabel}</Text>
              <Ionicons name="close" size={12} color={colors.textOnPrimary} />
            </TouchableOpacity>
          )}
          {searchResultLabel && (
            <Text style={[styles.resultCount, { color: colors.textMuted }]}>{searchResultLabel}</Text>
          )}
        </View>
      ) : null}

      {/* Content */}
      {entries.length === 0 ? (
        <EmptyState />
      ) : dayGroups.length === 0 ? (
        <NoResults
          query={hasFilter ? (filterLabel ?? '') : searchQuery}
          isDate={hasFilter}
          colors={colors}
        />
      ) : (
        <FlatList
          data={dayGroups}
          renderItem={renderGroup}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          extraData={entries.length}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primaryDark }]}
        onPress={() => navigation.navigate('AddEntry')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={34} color={colors.textOnPrimary} />
      </TouchableOpacity>

      {/* Date Filter Modal */}
      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterVisible(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Date</Text>
            <TouchableOpacity onPress={clearFilter} style={[styles.clearBtn, { backgroundColor: colors.dangerLight }]}>
              <Text style={[styles.clearBtnText, { color: colors.danger }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Year */}
            <Text style={[styles.filterSectionLabel, { color: colors.textMuted }]}>YEAR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
              {availableYears.map((y) => (
                <TouchableOpacity
                  key={y}
                  onPress={() => setFilterYear(filterYear === y ? null : y)}
                  style={[styles.filterPill, { backgroundColor: filterYear === y ? colors.primary : colors.surfaceElevated, borderColor: filterYear === y ? colors.primary : colors.border }]}
                >
                  <Text style={[styles.filterPillText, { color: filterYear === y ? colors.textOnPrimary : colors.text }]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Month */}
            <Text style={[styles.filterSectionLabel, { color: colors.textMuted }]}>MONTH</Text>
            <View style={styles.monthGrid}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setFilterMonth(filterMonth === i ? null : i)}
                  style={[styles.monthPill, { backgroundColor: filterMonth === i ? colors.primary : colors.surfaceElevated, borderColor: filterMonth === i ? colors.primary : colors.border }]}
                >
                  <Text style={[styles.monthPillText, { color: filterMonth === i ? colors.textOnPrimary : colors.text }]}>{m.slice(0, 3)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Day */}
            <Text style={[styles.filterSectionLabel, { color: colors.textMuted }]}>DAY (1–31)</Text>
            <View style={[styles.dayInputWrapper, { backgroundColor: colors.surfaceElevated, borderColor: filterDay ? colors.primary : colors.border }]}>
              <TextInput
                value={filterDay}
                onChangeText={(t) => {
                  const n = t.replace(/[^0-9]/g, '');
                  if (n === '' || (parseInt(n, 10) >= 1 && parseInt(n, 10) <= 31)) setFilterDay(n);
                }}
                placeholder="e.g. 20"
                placeholderTextColor={colors.textMuted}
                style={[styles.dayInput, { color: colors.text }]}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="done"
              />
            </View>
            <View style={{ height: 24 }} />
          </ScrollView>

          <TouchableOpacity onPress={() => setFilterVisible(false)} style={[styles.applyBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.applyBtnText, { color: colors.textOnPrimary }]}>
              {hasFilter ? `Apply Filter${filterLabel ? ': ' + filterLabel : ''}` : 'Apply'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { gap: 4 },
  headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  countBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  countText: { fontSize: 12, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  searchBarContainer: {
    overflow: 'hidden', paddingHorizontal: 14,
    justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  chipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  chipText: { fontSize: 12, fontWeight: '700' },
  resultCount: { fontSize: 12, fontWeight: '500', marginLeft: 'auto' },
  listContent: { paddingTop: 16, paddingBottom: 110 },
  fab: {
    position: 'absolute', bottom: 30, right: 22,
    width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 20,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  clearBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  clearBtnText: { fontSize: 13, fontWeight: '700' },
  filterSectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 10, marginTop: 4 },
  pillScroll: { marginBottom: 18 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  filterPillText: { fontSize: 14, fontWeight: '700' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  monthPill: { width: '22%', paddingVertical: 9, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  monthPillText: { fontSize: 13, fontWeight: '600' },
  dayInputWrapper: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, width: 100 },
  dayInput: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  applyBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  applyBtnText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
});