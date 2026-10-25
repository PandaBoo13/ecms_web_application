import { create } from 'zustand';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import 'dayjs/locale/en';

export type LocaleType = 'en' | 'vi';

interface LocaleState {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
}

const getInitialLocale = (): LocaleType => {
  const saved = localStorage.getItem('app_locale');
  if (saved === 'en' || saved === 'vi') return saved;
  return 'vi';
};

const initial = getInitialLocale();
dayjs.locale(initial === 'vi' ? 'vi' : 'en');

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: initial,
  setLocale: (locale: LocaleType) => {
    localStorage.setItem('app_locale', locale);
    dayjs.locale(locale === 'vi' ? 'vi' : 'en');
    set({ locale });
  },
}));

