import { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { cn } from '@/utils/cn';
import { X, Search } from 'lucide-react';

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string) => void;
  className?: string;
}

const EMOJI_CATEGORIES = {
  'Work': ['📝', '📋', '📊', '💼', '📈', '📉', '📁', '📂', '🗂️', '📅', '📆', '🗓️', '📜', '📄', '📃', '📑', '🗒️', '📓', '📔', '📕'],
  'Development': ['💻', '🖥️', '⌨️', '🖱️', '💾', '💿', '📀', '🔧', '🔨', '⚙️', '🛠️', '⚡', '🔌', '🔋', '💡', '🔦', '🕹️', '🖲️', '🎮', '🎯'],
  'Status': ['✅', '❌', '⚠️', '🔴', '🟡', '🟢', '🔵', '🟣', '⭐', '🌟', '✨', '💫', '🎉', '🎊', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️'],
  'Actions': ['🚀', '🎯', '🎨', '🔍', '🔎', '📌', '📍', '🔗', '🔓', '🔒', '🔑', '🗝️', '⏰', '⏱️', '⏲️', '🕐', '📢', '📣', '🔔', '🔕'],
  'Communication': ['💬', '💭', '🗨️', '🗯️', '💤', '📧', '📨', '📩', '✉️', '📮', '📪', '📫', '📬', '📭', '📯', '📥', '📤', '📦', '🏷️', '🔖'],
  'Alerts': ['🚨', '🔥', '💥', '💢', '💯', '🆘', '⛔', '🚫', '❗', '❓', '❕', '❔', '⁉️', '‼️', '⚡', '☢️', '☣️', '⚠️', '🚸', '🔺'],
  'Science': ['🧪', '🧬', '🔬', '🧫', '⚗️', '🌡️', '💊', '💉', '🩹', '🩺', '🧮', '📡', '🔭', '🔬', '🧲', '⚛️', '🧯', '🔩', '⚙️', '🗜️'],
  'Nature': ['🌱', '🌿', '🍀', '🌾', '🌳', '🌲', '🌴', '🌵', '🌺', '🌻', '🌼', '🌷', '🌸', '🌹', '🥀', '🌰', '🍄', '🐚', '🏔️', '🌋'],
  'Weather': ['☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '🌊', '🌈', '🌪️'],
  'Symbols': ['♻️', '✳️', '❇️', '✴️', '❎', '✔️', '☑️', '✖️', '❌', '⭕', '🔲', '🔳', '⚫', '⚪', '🟤', '🔴', '🟠', '🟡', '🟢', '🔵'],
};

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Work');
  const [searchQuery, setSearchQuery] = useState('');
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      // If not enough space below and more space above, show on top
      if (spaceBelow < 400 && spaceAbove > spaceBelow) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    }
  }, [isOpen]);

  const filteredEmojis = searchQuery
    ? Object.values(EMOJI_CATEGORIES).flat().filter(emoji =>
        emoji.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES];

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-10 w-10 rounded-md border border-input bg-background",
          "flex items-center justify-center text-lg transition-all",
          "hover:border-accent-foreground/50 hover:bg-accent/50",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
          isOpen && "ring-2 ring-ring ring-offset-2 ring-offset-background"
        )}
      >
        {value || '😀'}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={popupRef}
            className={cn(
              "absolute left-0 z-50 w-96 rounded-lg border border-border bg-popover/95 backdrop-blur-sm shadow-xl",
              position === 'bottom' ? 'top-12' : 'bottom-12'
            )}
          >
            <div className="p-3 border-b border-border space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Choose an emoji</h3>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search emojis..."
                  className={cn(
                    "w-full h-7 pl-7 pr-3 rounded-md border border-input bg-background text-xs",
                    "focus:outline-none focus:ring-1 focus:ring-ring"
                  )}
                />
              </div>
            </div>

            <div className="flex max-h-[320px]">
              {!searchQuery && (
                <div className="w-28 border-r border-border bg-muted/20 overflow-y-auto scrollbar-thin">
                  {Object.keys(EMOJI_CATEGORIES).map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        "w-full px-3 py-1.5 text-xs text-left transition-all duration-200",
                        selectedCategory === category
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-accent/50 hover:text-accent-foreground"
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 p-3 overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-10 gap-1">
                  {filteredEmojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleSelect(emoji)}
                      className={cn(
                        "h-8 w-8 rounded-md hover:bg-accent/60 hover:scale-110 transition-all duration-150",
                        "flex items-center justify-center text-base",
                        value === emoji && "bg-primary/30 ring-1 ring-primary scale-110"
                      )}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                  {filteredEmojis.length === 0 && (
                    <div className="col-span-10 text-center py-8 text-muted-foreground text-xs">
                      No emojis found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
