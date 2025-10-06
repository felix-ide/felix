import { useState } from 'react';
import { Button } from '@client/shared/ui/Button';
import { WalkthroughSlideshow } from './WalkthroughSlideshow';
import { TaskDataProvider } from '../views/shared/TaskDataProvider';
import { Presentation, Play, Info } from 'lucide-react';

export function SlideshowDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [demoView, setDemoView] = useState<'gantt' | 'timeline' | 'kanban'>('gantt');

  return (
    <TaskDataProvider initialView={demoView}>
      <div className="p-8 space-y-6">
        <div className="bg-card rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Presentation className="h-6 w-6" />
            Implementation Walkthrough Slideshow
          </h1>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="space-y-2">
                <p className="text-gray-700">
                  The Implementation Walkthrough Slideshow presents your project documentation in an organized, 
                  step-by-step format based on your task hierarchy and dependencies.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Navigate through documentation pages in implementation order</li>
                  <li>View associated diagrams, notes, and task details</li>
                  <li>Keyboard navigation with arrow keys and shortcuts</li>
                  <li>Auto-advance feature with configurable timing</li>
                  <li>Full-screen presentation mode</li>
                  <li>Integration with Gantt, Timeline, and Kanban views</li>
                </ul>
              </div>
            </div>

            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold mb-3">Keyboard Shortcuts</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between px-3 py-2 bg-muted rounded">
                  <span className="font-mono">←/→</span>
                  <span className="text-muted-foreground">Navigate slides</span>
                </div>
                <div className="flex justify-between px-3 py-2 bg-muted rounded">
                  <span className="font-mono">Space</span>
                  <span className="text-muted-foreground">Play/Pause auto-advance</span>
                </div>
                <div className="flex justify-between px-3 py-2 bg-muted rounded">
                  <span className="font-mono">Ctrl+F</span>
                  <span className="text-muted-foreground">Toggle fullscreen</span>
                </div>
                <div className="flex justify-between px-3 py-2 bg-muted rounded">
                  <span className="font-mono">ESC</span>
                  <span className="text-muted-foreground">Exit slideshow</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold mb-3">View Mode</h2>
              <div className="flex gap-2">
                <Button
                  variant={demoView === 'gantt' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDemoView('gantt')}
                >
                  Gantt
                </Button>
                <Button
                  variant={demoView === 'timeline' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDemoView('timeline')}
                >
                  Timeline
                </Button>
                <Button
                  variant={demoView === 'kanban' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDemoView('kanban')}
                >
                  Kanban
                </Button>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button onClick={() => setIsOpen(true)} className="gap-2">
                <Play className="h-4 w-4" />
                Start Slideshow
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(true)}
                className="gap-2"
              >
                <Presentation className="h-4 w-4" />
                Start from Specific Task
              </Button>
            </div>
          </div>
        </div>

        <WalkthroughSlideshow
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          view={demoView}
        />
      </div>
    </TaskDataProvider>
  );
}