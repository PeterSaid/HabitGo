/**
 * Ready-made habit suggestions for the Add Habit quick-pick dropdown.
 * Each preset carries its category (which drives the color via CATEGORY_COLORS),
 * icon, and — for measurable habits — goal value + unit. The name stays editable
 * after picking, and "custom" lets the user type their own habit from scratch.
 */
export type HabitPreset = {
  id: string;
  ar: string;
  en: string;
  category: string;
  icon: string;
  type?: 'binary' | 'quantitative';
  goal?: number;
  unit_ar?: string;
  unit_en?: string;
};

export const HABIT_PRESETS: HabitPreset[] = [
  { id: 'water', ar: 'شرب الماء', en: 'Drink water', category: 'water', icon: 'droplet', type: 'quantitative', goal: 8, unit_ar: 'أكواب', unit_en: 'cups' },
  { id: 'workout', ar: 'تمارين رياضية', en: 'Morning workout', category: 'sports', icon: 'dumbbell' },
  { id: 'walk', ar: 'المشي 10,000 خطوة', en: 'Walk 10,000 steps', category: 'sports', icon: 'sunrise', type: 'quantitative', goal: 10000, unit_ar: 'خطوة', unit_en: 'steps' },
  { id: 'run', ar: 'الركض', en: 'Running', category: 'sports', icon: 'flame', type: 'quantitative', goal: 3, unit_ar: 'كم', unit_en: 'km' },
  { id: 'read-minutes', ar: 'قراءة 20 دقيقة', en: 'Read 20 minutes', category: 'reading', icon: 'open-book', type: 'quantitative', goal: 20, unit_ar: 'دقيقة', unit_en: 'min' },
  { id: 'quran', ar: 'ورد القرآن', en: 'Daily Quran', category: 'reading', icon: 'open-book' },
  { id: 'language', ar: 'تعلم لغة', en: 'Learn a language', category: 'learning', icon: 'graduation-cap' },
  { id: 'code', ar: 'برمجة يومية', en: 'Code daily', category: 'learning', icon: 'zap' },
  { id: 'sleep-early', ar: 'النوم قبل 11', en: 'Sleep before 11 PM', category: 'sleep', icon: 'moon' },
  { id: 'meditate', ar: 'تأمل 10 دقائق', en: 'Meditate 10 minutes', category: 'meditation', icon: 'flower', type: 'quantitative', goal: 10, unit_ar: 'دقيقة', unit_en: 'min' },
  { id: 'healthy-eat', ar: 'أكل صحي', en: 'Eat healthy', category: 'nutrition', icon: 'apple' },
  { id: 'no-sugar', ar: 'يوم بدون سكر', en: 'No sugar day', category: 'nutrition', icon: 'candy' },
  { id: 'vitamins', ar: 'فيتامينات', en: 'Take vitamins', category: 'health', icon: 'heart' },
  { id: 'cold-shower', ar: 'دش بارد', en: 'Cold shower', category: 'health', icon: 'droplet' },
  { id: 'plan-day', ar: 'تخطيط اليوم', en: 'Plan the day', category: 'productivity', icon: 'check-square' },
  { id: 'no-social', ar: 'يوم بدون سوشيال ميديا', en: 'No social media', category: 'productivity', icon: 'list' },
  { id: 'deep-work', ar: 'ساعة عمل مركّز', en: 'Deep work hour', category: 'work', icon: 'briefcase', type: 'quantitative', goal: 1, unit_ar: 'ساعة', unit_en: 'hour' },
  { id: 'save-money', ar: 'توفير يومي', en: 'Save money', category: 'money', icon: 'coins' },
  { id: 'expenses', ar: 'تسجيل المصروفات', en: 'Track expenses', category: 'money', icon: 'banknote' },
  { id: 'journal', ar: 'كتابة اليوميات', en: 'Journal', category: 'personal-growth', icon: 'sprout' },
  { id: 'gratitude', ar: '3 ممتنات', en: 'Gratitude x3', category: 'personal-growth', icon: 'hand-heart' },
  { id: 'family', ar: 'اتصال بالعيلة', en: 'Call family', category: 'relationships', icon: 'users' },
];
