import { createContext, useContext, useState } from 'react';
import { useHistory } from '../hooks/useHistory';

type HistoryState = ReturnType<typeof useHistory> & {
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
};

const HistoryContext = createContext<HistoryState | null>(null);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const history = useHistory();
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <HistoryContext.Provider value={{ ...history, historyOpen, setHistoryOpen }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistoryContext(): HistoryState {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistoryContext must be used inside HistoryProvider');
  return ctx;
}
