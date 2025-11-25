import React, { createContext, useContext, useState } from 'react';

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [activeNavItems, setActiveNavItems] = useState(['Dashboard']); // Default active items
  const [selectedSidebarItem, setSelectedSidebarItem] = useState(null);

  // Define which horizontal nav items should be active for each sidebar selection
  const getActiveItemsForSidebarSelection = (sidebarItemId) => {
    switch(sidebarItemId) {
      case 1000: // Company Information
        return ['Dashboard', 'Background', 'L Forms', 'Metrics', 'Analytics', 'Annual Data', 'Documents', 'Peers', 'News'];
      case 1001: // Industry Metrics
        return ['Dashboard', 'Analytics', 'Documents'];
      case 1002: // Industry Aggregates
        return ['Dashboard', 'Analytics', 'Documents', 'News'];
      case 1003: // Products
        return ['Child Plans', 'Investment Plans', 'Protection Plans', 'Term Plans', 'New Launches'];
      case 1004: // Report Generator
        return ['Define Template', 'Save Template'];
      case 1005: // Screener
        return ['Screener Inputs', 'Screener Output Sheets'];
      case 1006: // IRDAI Monthly Data
        return ['Dashboard', 'Analytics', 'Peers', 'Documents'];
      case 1007: // Economy
        return ['Dashboard', 'Domestic', 'International'];
      default:
        return ['Dashboard'];
    }
  };

  const handleSidebarItemClick = (itemId, itemName) => {
    setSelectedSidebarItem(itemId);
    const newActiveItems = getActiveItemsForSidebarSelection(itemId);
    setActiveNavItems(newActiveItems);
    console.log(`Sidebar item ${itemName} selected. Active nav items:`, newActiveItems);
  };

  const isNavItemActive = (navItemName) => {
    return activeNavItems.includes(navItemName);
  };

  const value = {
    activeNavItems,
    selectedSidebarItem,
    handleSidebarItemClick,
    isNavItemActive,
    setActiveNavItems
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};
