import { useState, useCallback } from 'react';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  similarity?: number;
  filePath?: string;
  snippet?: string;
  metadata?: any;
}

interface EntitySearchModalOptions {
  title?: string;
  placeholder?: string;
  allowedEntityTypes?: ('component' | 'task' | 'note' | 'rule')[];
  multiSelect?: boolean;
  maxSelections?: number;
  showFilters?: boolean;
  autoFocus?: boolean;
}

interface UseEntitySearchModalReturn {
  isOpen: boolean;
  openModal: (options?: EntitySearchModalOptions) => void;
  closeModal: () => void;
  modalProps: EntitySearchModalOptions & {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (entity: SearchResult | SearchResult[]) => void;
  };
  selectedEntities: SearchResult[];
  clearSelection: () => void;
}

export function useEntitySearchModal(
  onSelect?: (entity: SearchResult | SearchResult[]) => void
): UseEntitySearchModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<EntitySearchModalOptions>({});
  const [selectedEntities, setSelectedEntities] = useState<SearchResult[]>([]);

  const openModal = useCallback((options: EntitySearchModalOptions = {}) => {
    setModalOptions(options);
    setSelectedEntities([]);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setModalOptions({});
    setSelectedEntities([]);
  }, []);

  const handleSelect = useCallback((entity: SearchResult) => {
    if (modalOptions.multiSelect) {
      // For multi-select, accumulate selections
      setSelectedEntities(prev => {
        const isAlreadySelected = prev.some(e => e.id === entity.id);
        if (isAlreadySelected) {
          return prev.filter(e => e.id !== entity.id);
        } else {
          const newSelection = [...prev, entity];
          // If this completes the selection, call onSelect
          return newSelection;
        }
      });
    } else {
      // For single select, immediately call onSelect and close
      onSelect?.(entity);
      closeModal();
    }
  }, [modalOptions.multiSelect, onSelect, closeModal]);

  const clearSelection = useCallback(() => {
    setSelectedEntities([]);
  }, []);

  // Handle multi-select completion (removed as it's handled inline)
  // const handleMultiSelectComplete = useCallback((entities: SearchResult[]) => {
  //   onSelect?.(entities);
  //   closeModal();
  // }, [onSelect, closeModal]);

  const modalOnSelect = useCallback((entities: SearchResult | SearchResult[]) => {
    if (modalOptions.multiSelect) {
      if (Array.isArray(entities)) {
        // Handle multi-select completion
        onSelect?.(entities);
        closeModal();
      } else {
        // Handle individual entity toggle in multi-select mode
        const entity = entities;
        const isSelected = selectedEntities.some(e => e.id === entity.id);
        if (isSelected) {
          setSelectedEntities(prev => prev.filter(e => e.id !== entity.id));
        } else {
          if (!modalOptions.maxSelections || selectedEntities.length < modalOptions.maxSelections) {
            setSelectedEntities(prev => [...prev, entity]);
          }
        }
      }
    } else {
      // Single select mode - only accept single entities
      if (!Array.isArray(entities)) {
        handleSelect(entities);
      }
    }
  }, [modalOptions.multiSelect, modalOptions.maxSelections, selectedEntities, onSelect, closeModal, handleSelect]);

  return {
    isOpen,
    openModal,
    closeModal,
    modalProps: {
      ...modalOptions,
      isOpen,
      onClose: closeModal,
      onSelect: modalOnSelect
    },
    selectedEntities,
    clearSelection
  };
}