declare module 'react-chrono' {
  import { ReactNode } from 'react';

  export interface TimelineItem {
    title?: string | ReactNode;
    cardTitle?: string;
    cardSubtitle?: string;
    cardDetailedText?: string | ReactNode;
    date?: string;
    id?: string;
    timelineContent?: any;
    media?: {
      name?: string;
      source?: {
        url?: string;
      };
      type?: string;
    };
  }

  export interface TimelineTheme {
    primary?: string;
    secondary?: string;
    cardBgColor?: string;
    cardForeColor?: string;
    titleColor?: string;
    titleColorActive?: string;
    textColor?: string;
  }

  export interface TimelineFontSizes {
    cardSubtitle?: string;
    cardText?: string;
    cardTitle?: string;
    title?: string;
  }

  export interface TimelineClassNames {
    card?: string;
    cardMedia?: string;
    cardSubTitle?: string;
    cardText?: string;
    cardTitle?: string;
    controls?: string;
    title?: string;
  }

  export interface TimelineScrollable {
    scrollbar?: boolean | string;
  }

  export interface ChronoProps {
    items?: TimelineItem[];
    mode?: 'HORIZONTAL' | 'VERTICAL' | 'VERTICAL_ALTERNATING';
    cardHeight?: number;
    cardWidth?: number;
    hideControls?: boolean;
    useReadMore?: boolean;
    disableClickOnCircle?: boolean;
    lineWidth?: number;
    theme?: TimelineTheme;
    fontSizes?: TimelineFontSizes;
    classNames?: TimelineClassNames;
    enableOutline?: boolean;
    activeItemIndex?: number;
    onItemSelected?: (item: TimelineItem | null) => void;
    scrollable?: boolean | TimelineScrollable;
    mediaHeight?: number;
    slideShow?: boolean;
    slideItemDuration?: number;
    enableKeyboardNavigation?: boolean;
    allowDynamicUpdate?: boolean;
    onScrollEnd?: () => void;
    nestedCardHeight?: number;
    useNestedCards?: boolean;
    readMore?: string;
    showAllCards?: boolean;
    disableNavOnKey?: boolean;
    onThemeChange?: () => void;
    focusActiveItemOnLoad?: boolean;
    borderLessCards?: boolean;
    textOverlay?: boolean;
    timelinePointDimension?: number;
    timelinePointShape?: 'circle' | 'square' | 'diamond';
    cardLess?: boolean;
    buttonTexts?: {
      first?: string;
      last?: string;
      next?: string;
      previous?: string;
    };
    children?: ReactNode;
  }

  export function Chrono(props: ChronoProps): JSX.Element;

  export interface TimelineCardContentProps {
    children: ReactNode;
  }

  export function TimelineCardContent(props: TimelineCardContentProps): JSX.Element;

  export interface TimelineItemMediaProps {
    children: ReactNode;
  }

  export function TimelineItemMedia(props: TimelineItemMediaProps): JSX.Element;
}