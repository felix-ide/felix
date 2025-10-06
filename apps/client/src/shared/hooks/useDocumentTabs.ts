import { useCallback } from 'react';
import { useDocumentStore } from '@client/shared/state/documentStore';

export function useDocumentTabs() {
  const {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    setActiveTab,
    updateTabContent,
    updateTabTitle,
    saveTab,
    saveAllTabs,
    getTab,
    getActiveTab,
    hasUnsavedChanges,
  } = useDocumentStore();

  // Get active tab
  const activeTab = getActiveTab();

  // Handle tab creation from file browser
  const handleFileOpen = useCallback(async (filePath: string) => {
    try {
      // Integration stub: when the document editor returns, load content via HTTP file API
      openTab(filePath);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, [openTab]);

  // Handle content changes
  const handleContentChange = useCallback((content: string) => {
    if (activeTabId) {
      updateTabContent(activeTabId, content);
    }
  }, [activeTabId, updateTabContent]);

  // Handle save with Ctrl+S
  const handleSave = useCallback(async () => {
    if (activeTabId) {
      try {
        await saveTab(activeTabId);
      } catch (error) {
        console.error('Failed to save:', error);
      }
    }
  }, [activeTabId, saveTab]);

  // Handle save all
  const handleSaveAll = useCallback(async () => {
    try {
      await saveAllTabs();
    } catch (error) {
      console.error('Failed to save all:', error);
    }
  }, [saveAllTabs]);

  // Handle tab close with unsaved changes check
  const handleTabClose = useCallback((tabId: string) => {
    const tab = getTab(tabId);
    if (tab?.isDirty) {
      const shouldClose = window.confirm(
        `${tab.title} has unsaved changes. Are you sure you want to close it?`
      );
      if (!shouldClose) return;
    }
    closeTab(tabId);
  }, [closeTab, getTab]);

  // Handle new untitled document
  const handleNewDocument = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_');
    const filePath = `Untitled_${timestamp}.md`;
    openTab(filePath);
  }, [openTab]);

  // Create context menu actions
  const getTabContextMenu = useCallback((tabId: string) => [
    {
      label: 'Close',
      action: () => handleTabClose(tabId),
    },
    {
      label: 'Close Others',
      action: () => closeOtherTabs(tabId),
    },
    {
      label: 'Close All',
      action: () => {
        if (hasUnsavedChanges()) {
          const shouldClose = window.confirm(
            'Some tabs have unsaved changes. Are you sure you want to close all tabs?'
          );
          if (!shouldClose) return;
        }
        closeAllTabs();
      },
    },
    { type: 'separator' },
    {
      label: 'Save',
      action: () => saveTab(tabId),
      disabled: !getTab(tabId)?.isDirty,
    },
    {
      label: 'Save All',
      action: handleSaveAll,
      disabled: !hasUnsavedChanges(),
    },
  ], [handleTabClose, closeOtherTabs, closeAllTabs, saveTab, handleSaveAll, getTab, hasUnsavedChanges]);

  return {
    // State
    tabs,
    activeTab,
    activeTabId,
    hasUnsavedChanges: hasUnsavedChanges(),

    // Actions
    openTab: handleFileOpen,
    closeTab: handleTabClose,
    closeAllTabs,
    closeOtherTabs,
    setActiveTab,
    updateContent: handleContentChange,
    updateTitle: updateTabTitle,
    newDocument: handleNewDocument,
    save: handleSave,
    saveAll: handleSaveAll,
    getTabContextMenu,

    // Utilities
    getTab,
  };
}
