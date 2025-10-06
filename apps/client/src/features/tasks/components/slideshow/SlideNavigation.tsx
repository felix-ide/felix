import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';
import type { TaskData } from '@/types/api';

interface SlideNavigationProps {
  currentIndex: number;
  totalSlides: number;
  onNavigate: (index: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  slides: Array<{
    task: TaskData;
    index: number;
    totalSlides: number;
  }>;
  className?: string;
}

export function SlideNavigation({
  currentIndex,
  totalSlides,
  onNavigate,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  slides,
  className
}: SlideNavigationProps) {
  return (
    <div className={cn(
      'absolute bottom-0 left-0 right-0 z-10',
      'bg-gradient-to-t from-background via-background/80 to-transparent',
      'p-4',
      className
    )}>
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        {/* Slide dots and counter */}
        <div className="flex flex-col items-center gap-2">
          {/* Progress counter */}
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {totalSlides}
          </span>

          {/* Dot navigation */}
          <div className="flex items-center gap-1">
            {slides.map((slide, index) => (
              <button
                key={slide.task.id}
                onClick={() => onNavigate(index)}
                className={cn(
                  'group relative',
                  'w-2 h-2 rounded-full transition-all duration-200',
                  'hover:scale-125',
                  index === currentIndex
                    ? 'w-8 bg-primary'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                )}
                aria-label={`Go to slide ${index + 1}: ${slide.task.title}`}
              >
                {/* Tooltip */}
                <div className={cn(
                  'absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
                  'px-2 py-1 bg-popover border rounded-md shadow-md',
                  'text-xs whitespace-nowrap',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  'pointer-events-none'
                )}>
                  {slide.task.title}
                </div>
              </button>
            ))}
          </div>

          {/* Current slide title */}
          <div className="text-sm font-medium text-center max-w-md truncate">
            {slides[currentIndex]?.task.title}
          </div>
        </div>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!canGoNext}
          className="gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Use arrow keys to navigate • Space to play/pause • ESC to exit • Ctrl+F for fullscreen
        </p>
      </div>
    </div>
  );
}