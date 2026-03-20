import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TravelEntry } from '../types';
import { STORAGE_KEY } from '../constants/theme';

export interface UseTravelEntriesReturn {
  entries: TravelEntry[];
  isLoading: boolean;
  error: string | null;
  loadEntries: () => Promise<void>;
  addEntry: (entry: TravelEntry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  clearError: () => void;
}

const useTravelEntries = (): UseTravelEntriesReturn => {
  const [entries, setEntries] = useState<TravelEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: TravelEntry[] = JSON.parse(stored);
        if (Array.isArray(parsed)) setEntries(parsed);
        else throw new Error('Corrupted storage data.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load entries.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addEntry = useCallback(async (entry: TravelEntry) => {
    if (!entry.id || !entry.imageUri || !entry.address || !entry.createdAt) {
      throw new Error('Invalid entry: missing required fields.');
    }
    const updated = [entry, ...entries];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setEntries(updated);
  }, [entries]);

  const removeEntry = useCallback(async (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setEntries(updated);
  }, [entries]);

  return { entries, isLoading, error, loadEntries, addEntry, removeEntry, clearError };
};

export default useTravelEntries;