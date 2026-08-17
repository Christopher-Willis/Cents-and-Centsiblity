import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function usePersistentState<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(key)
      .then((stored) => {
        if (stored && mounted) {
          setState(JSON.parse(stored) as T);
        }
      })
      .catch(() => {
        // ignore load errors and keep initial value
      });
    return () => {
      mounted = false;
    };
  }, [key]);

  useEffect(() => {
    AsyncStorage.setItem(key, JSON.stringify(state)).catch(() => {
      // ignore save errors
    });
  }, [key, state]);

  return [state, setState];
}
