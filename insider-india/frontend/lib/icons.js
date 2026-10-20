import {
  CookingPot, Archive, PanelsTopLeft, Layers, PaintRoller, DoorOpen, Tv, Flame, Sofa, Boxes, Armchair, Lamp,
  Sparkles, Building2, Home, Castle, Hammer, KeyRound, Store,
  DoorClosed, Presentation, Users, ConciergeBell, Coffee, Bath, Server, LayoutGrid, Receipt, Shirt, Utensils, Wine,
  Stethoscope, AudioLines, Grid3x3, Cable,
} from 'lucide-react';

const ICONS = {
  CookingPot, Archive, PanelsTopLeft, Layers, PaintRoller, DoorOpen, Tv, Flame, Sofa, Boxes, Armchair, Lamp, Sparkles, Building2, Home, Castle, Hammer, KeyRound, Store,
  DoorClosed, Presentation, Users, ConciergeBell, Coffee, Bath, Server, LayoutGrid, Receipt, Shirt, Utensils, Wine, Stethoscope, AudioLines, Grid3x3, Cable,
};

export const ICON_NAMES = Object.keys(ICONS);

export function Icon({ name, className = 'size-6', fallback = 'Sparkles' }) {
  const C = ICONS[name] || ICONS[fallback];
  return <C className={className} strokeWidth={1.5} aria-hidden="true" />;
}
