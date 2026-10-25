import { vi } from './vi';
import { en } from './en';
import type { LocaleType } from '@/stores/localeStore';

export const dictionaries = {
  vi,
  en,
};

export type TranslationKey = keyof typeof vi;

export const translate = (locale: LocaleType, key: TranslationKey | string, defaultText?: string): string => {
  const dict = dictionaries[locale] || dictionaries.vi;
  const val = (dict as Record<string, string>)[key];
  if (val) return val;
  return defaultText || key;
};

