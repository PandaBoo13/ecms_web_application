import { useCallback } from 'react';
import { useLocaleStore } from '@/stores/localeStore';
import { translate, type TranslationKey } from '@/locales';

export const useTranslation = () => {
  const { locale, setLocale } = useLocaleStore();

  const t = useCallback(
    (key: TranslationKey | string, defaultText?: string) => {
      return translate(locale, key, defaultText);
    },
    [locale]
  );

  return {
    t,
    locale,
    setLocale,
    isVi: locale === 'vi',
    isEn: locale === 'en',
  };
};

export default useTranslation;
