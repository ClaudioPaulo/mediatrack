import { useEffect, useState } from 'react';

/** Devolve `value` apenas depois de `delayMs` sem alterações — usado para debouncing de pesquisa */
export function useDebounce<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
