import {
  CookingPot, Archive, PanelsTopLeft, Layers, PaintRoller, DoorOpen, Tv, Flame, Sofa, Boxes, Armchair, Lamp,
  Sparkles, Building2, Home, Castle, Hammer, KeyRound, Store,
} from 'lucide-react';

const ICONS = { CookingPot, Archive, PanelsTopLeft, Layers, PaintRoller, DoorOpen, Tv, Flame, Sofa, Boxes, Armchair, Lamp, Sparkles, Building2, Home, Castle, Hammer, KeyRound, Store };

export function Icon({ name, className = 'size-6', fallback = 'Sparkles' }) {
  const C = ICONS[name] || ICONS[fallback];
  return <C className={className} strokeWidth={1.5} aria-hidden="true" />;
}
