import {Navigator} from '../navigation/TVNavigation';

/** Props every screen receives from the App shell. */
export interface ScreenProps {
  navigator: Navigator;
  /** Control to focus on entry (restored when coming back via Back). */
  initialFocusKey?: string;
  /** Mystery chosen in the library (local state only in Phase 2). */
  selectedMysteryId: string;
  onSelectMystery: (mysteryId: string) => void;
}
