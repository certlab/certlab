import * as React from 'react';

export type RightSidebarPanel = 'notifications' | null;

type RightSidebarContextProps = {
  isOpen: boolean;
  activePanel: RightSidebarPanel;
  openPanel: (panel: RightSidebarPanel) => void;
  closePanel: () => void;
  togglePanel: (panel: RightSidebarPanel) => void;
};

const RightSidebarContext = React.createContext<RightSidebarContextProps | null>(null);

export function useRightSidebar() {
  const context = React.useContext(RightSidebarContext);
  if (!context) {
    throw new Error('useRightSidebar must be used within a RightSidebarProvider.');
  }
  return context;
}

export function RightSidebarProvider({ children }: { children: React.ReactNode }) {
  const [activePanel, setActivePanel] = React.useState<RightSidebarPanel>(null);

  const isOpen = activePanel !== null;

  const openPanel = React.useCallback((panel: RightSidebarPanel) => {
    setActivePanel(panel);
  }, []);

  const closePanel = React.useCallback(() => {
    setActivePanel(null);
  }, []);

  const togglePanel = React.useCallback((panel: RightSidebarPanel) => {
    setActivePanel((current) => (current === panel ? null : panel));
  }, []);

  const contextValue = React.useMemo(
    () => ({
      isOpen,
      activePanel,
      openPanel,
      closePanel,
      togglePanel,
    }),
    [isOpen, activePanel, openPanel, closePanel, togglePanel]
  );

  return (
    <RightSidebarContext.Provider value={contextValue}>{children}</RightSidebarContext.Provider>
  );
}
