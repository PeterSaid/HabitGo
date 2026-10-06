import {
  Apple, Banknote, Book, BookOpen, Briefcase, Candy, CheckSquare, Coins, Crown, Dumbbell, Flower2,
  Gift, GraduationCap, Heart, HeartHandshake, LayoutList, Moon, Palette, Star,
  Droplet, Tag, Users, Zap, Coffee, Clapperboard, Play, Sprout, Sunrise, Flame, Medal, Trophy,
  CalendarCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  star: Star,
  heart: Heart,
  dumbbell: Dumbbell,
  book: Book,
  'open-book': BookOpen,
  briefcase: Briefcase,
  zap: Zap,
  coins: Coins,
  moon: Moon,
  flower: Flower2,
  droplet: Droplet,
  apple: Apple,
  users: Users,
  sprout: Sprout,
  gift: Gift,
  tag: Tag,
  coffee: Coffee,
  'banknote': Banknote,
  'clapperboard': Clapperboard,
  play: Play,
  crown: Crown,
  'hand-heart': HeartHandshake,
  candy: Candy,
  'graduation-cap': GraduationCap,
  'check-square': CheckSquare,
  palette: Palette,
  'calendar-check': CalendarCheck,
  flame: Flame,
  medal: Medal,
  trophy: Trophy,
  sunrise: Sunrise,
  flag: Zap,
  list: LayoutList,
};

export const HABIT_ICON_KEYS = Object.keys(ICONS);

export function HabitIcon({ name, size = 22, color, style }: { name: string; size?: number; color?: string; style?: React.CSSProperties }) {
  const Icon = ICONS[name] || Star;
  return <Icon size={size} color={color} style={style} />;
}

/** Soft tinted bubble behind a habit icon, using the habit's color. */
export function IconBubble({ icon, color, size = 46 }: { icon: string; color: string; size?: number }) {
  return (
    <div
      className="habit-icon"
      style={{ width: size, height: size, background: `${color}1F`, borderRadius: size * 0.28 }}
      aria-hidden
    >
      <HabitIcon name={icon} size={size * 0.48} color={color} />
    </div>
  );
}

export const CATEGORY_COLORS: Record<string, string> = {
  health: '#EF4444',
  sports: '#22C55E',
  learning: '#3B82F6',
  reading: '#8B5CF6',
  work: '#F59E0B',
  productivity: '#14B8A6',
  money: '#F5B942',
  sleep: '#6366F1',
  meditation: '#D946EF',
  water: '#0EA5E9',
  nutrition: '#84CC16',
  relationships: '#F472B6',
  'personal-growth': '#10B981',
  other: '#98A29C',
};

import type React from 'react';
