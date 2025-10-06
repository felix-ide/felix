import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSlideshowStateProps {
  totalSlides: number;
  onSlideChange?: (index: number) => void;
  autoAdvanceInterval?: number;
}

export function useSlideshowState({
  totalSlides,
  onSlideChange,
  autoAdvanceInterval = 5000
}: UseSlideshowStateProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Navigate to specific slide
  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentIndex(index);
      onSlideChange?.(index);
    }
  }, [totalSlides, onSlideChange]);

  // Navigate to next slide
  const nextSlide = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  // Navigate to previous slide
  const previousSlide = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  // Toggle auto-advance
  const toggleAutoAdvance = useCallback(() => {
    setIsAutoAdvancing(prev => !prev);
  }, []);

  // Set up auto-advance
  useEffect(() => {
    if (isAutoAdvancing && totalSlides > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev < totalSlides - 1) {
            const next = prev + 1;
            onSlideChange?.(next);
            return next;
          } else {
            setIsAutoAdvancing(false);
            return prev;
          }
        });
      }, autoAdvanceInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isAutoAdvancing, totalSlides, autoAdvanceInterval, onSlideChange]);

  // Reset when totalSlides changes
  useEffect(() => {
    if (currentIndex >= totalSlides && totalSlides > 0) {
      setCurrentIndex(totalSlides - 1);
    }
  }, [currentIndex, totalSlides]);

  return {
    currentIndex,
    isAutoAdvancing,
    canGoNext: currentIndex < totalSlides - 1,
    canGoPrevious: currentIndex > 0,
    goToSlide,
    nextSlide,
    previousSlide,
    toggleAutoAdvance
  };
}
