import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TravelEntry } from '../types';
import { STORAGE_KEY } from '../constants/theme';

interface EntriesContextType {
  entries: TravelEntry[];
  addEntry: (entry: TravelEntry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  isLoading: boolean;
}

const EntriesContext = createContext<EntriesContextType>({
  entries: [],
  addEntry: async () => {},
  removeEntry: async () => {},
  isLoading: true,
});

export const EntriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<TravelEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: TravelEntry[] = JSON.parse(stored);
          if (Array.isArray(parsed)) setEntries(parsed);
        }
      } catch (err) {
        console.error('Failed to load entries:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Read → prepend → persist → setState (no race condition)
  const addEntry = useCallback(async (entry: TravelEntry) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const current: TravelEntry[] = stored ? JSON.parse(stored) : [];
      const updated = [entry, ...current];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setEntries(updated);
    } catch (err) {
      console.error('Failed to add entry:', err);
      throw new Error('Could not save your memory. Please try again.');
    }
  }, []);

  // Read → filter → persist → setState
  const removeEntry = useCallback(async (id: string) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const current: TravelEntry[] = stored ? JSON.parse(stored) : [];
      const updated = current.filter((e) => e.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setEntries(updated);
    } catch (err) {
      console.error('Failed to remove entry:', err);
    }
  }, []);

  return (
    <EntriesContext.Provider value={{ entries, addEntry, removeEntry, isLoading }}>
      {children}
    </EntriesContext.Provider>
  );
};

export const useEntries = () => useContext(EntriesContext);