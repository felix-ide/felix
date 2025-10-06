import { useState, useEffect, useMemo } from 'react';
import { X, Maximize2, Minimize2, Play, Pause, Clock } from 'lucide-react';
import { useTaskData } from '../views/shared/TaskDataProvider';
import { SlideNavigation } from './SlideNavigation';
import { DocumentationSlide } from './DocumentationSlide';
import { useSlideshowState } from './useSlideshowState';
import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';
import type { TaskData } from '@/types/api';
import type { ViewType } from '../views/shared/ViewSwitcher';

interface WalkthroughSlideshowProps {
  isOpen: boolean;
  onClose: () => void;
  initialTaskId?: string;
  view?: ViewType;
  className?: string;
}

interface SlideData {
  task: TaskData;
  documentationNote?: any; // NoteData with documentation content
  index: number;
  totalSlides: number;
}

export function WalkthroughSlideshow({
  isOpen,
  onClose,
  initialTaskId,
  view = 'gantt',
  className
}: WalkthroughSlideshowProps) {
  const { allTasks, getTaskById, getChildTasks } = useTaskData();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // Build ordered slide list based on task hierarchy and dependencies
  const slides: SlideData[] = useMemo(() => {
    if (!allTasks.length) return [];

    // Find the root task for the slideshow
    let rootTask: TaskData | undefined;
    if (initialTaskId) {
      rootTask = getTaskById(initialTaskId);
    } else {
      // Find the main implementation walkthrough task
      rootTask = allTasks.find(task => 
        task.id === 'task_1749540873229_4zgsgv3r0' ||
        task.title.toLowerCase().includes('implementation walkthrough')
      );
    }

    if (!rootTask) {
      // Fallback to first root task
      rootTask = allTasks.find(task => !task.parent_id);
    }

    if (!rootTask) return [];

    // Build ordered list of tasks based on hierarchy and sort order
    const orderedTasks: TaskData[] = [];
    const visited = new Set<string>();

    const traverseTask = (task: TaskData) => {
      if (visited.has(task.id)) return;
      visited.add(task.id);

      // Add the task if it has documentation
      if (task.description || hasDocumentationNote(task)) {
        orderedTasks.push(task);
      }

      // Get children and sort by sort_order
      const children = getChildTasks(task.id)
        .sort((a, b) => a.sort_order - b.sort_order);

      // Traverse children in order
      children.forEach(child => traverseTask(child));
    };

    traverseTask(rootTask);

    // Convert to slide data
    return orderedTasks.map((task, index) => ({
      task,
      documentationNote: getDocumentationNote(task),
      index,
      totalSlides: orderedTasks.length
    }));
  }, [allTasks, initialTaskId, getTaskById, getChildTasks]);

  // Check if task has documentation note (mock implementation)
  const hasDocumentationNote = (task: TaskData): boolean => {
    // In real implementation, this would check for linked notes
    return task.entity_links?.some(link => 
      link.entity_type === 'note' && 
      link.link_strength === 'primary'
    ) || false;
  };

  // Get documentation note for task (mock implementation)
  const getDocumentationNote = (_task: TaskData): any => {
    // In real implementation, this would fetch the actual note
    return null;
  };

  // Use slideshow state hook
  const {
    currentIndex: currentSlideIndex,
    isAutoAdvancing,
    canGoNext,
    canGoPrevious,
    goToSlide,
    nextSlide,
    previousSlide,
    toggleAutoAdvance
  } = useSlideshowState({
    totalSlides: slides.length,
    autoAdvanceInterval: 5000
  });

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          nextSlide();
          break;
        case 'ArrowLeft':
          previousSlide();
          break;
        case 'Escape':
          onClose();
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setIsFullScreen(!isFullScreen);
          }
          break;
        case ' ':
          e.preventDefault();
          toggleAutoAdvance();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextSlide, previousSlide, onClose, isFullScreen, toggleAutoAdvance]);

  // Handle fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  if (!isOpen || slides.length === 0) return null;

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className={cn(
      'fixed inset-0 z-50 bg-background',
      isFullScreen && 'bg-black',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4',
        'bg-gradient-to-b from-background via-background/80 to-transparent',
        isFullScreen && 'from-black/80 via-black/60'
      )}>
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Implementation Walkthrough</h2>
          <span className="text-sm text-muted-foreground">
            {currentSlide.task.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-advance controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAutoAdvance}
            className={cn(
              'gap-2',
              isAutoAdvancing && 'text-primary'
            )}
          >
            {isAutoAdvancing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Auto
          </Button>

          {/* Timeline button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTimeline(!showTimeline)}
          >
            <Clock className="h-4 w-4" />
          </Button>

          {/* Fullscreen button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullScreen}
          >
            {isFullScreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="h-full pt-16 pb-20 px-4 overflow-hidden">
        <DocumentationSlide
          slide={currentSlide}
          view={view}
          showTimeline={showTimeline}
        />
      </div>

      {/* Navigation */}
      <SlideNavigation
        currentIndex={currentSlideIndex}
        totalSlides={slides.length}
        onNavigate={goToSlide}
        onNext={nextSlide}
        onPrevious={previousSlide}
        canGoNext={canGoNext}
        canGoPrevious={canGoPrevious}
        slides={slides}
      />
    </div>
  );
}
