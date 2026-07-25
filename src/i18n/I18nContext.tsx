import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  LOCALE_STORAGE_KEY,
  localeMeta,
  translatePhrase,
  type Locale,
} from '@/i18n/messages';

export type I18nContextValue = {
  locale: Locale;
  intlLocale: string;
  setLocale: (locale: Locale) => void;
  t: (phrase: string, variables?: Record<string, string | number>) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);
let activeLocale: Locale = 'id';

export function getActiveLocale() {
  return activeLocale;
}

function detectLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === 'id' || stored === 'en' || stored === 'zh-CN') return stored;
  const browser = navigator.language.toLowerCase();
  if (browser.startsWith('zh')) return 'zh-CN';
  if (browser.startsWith('en')) return 'en';
  return 'id';
}

const attributes = ['placeholder', 'title', 'aria-label'] as const;

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  const localeRef = useRef(locale);
  const originalText = useRef(new WeakMap<Text, string>());
  const originalAttributes = useRef(new WeakMap<Element, Map<string, string>>());
  const applying = useRef(false);

  const translateTextNode = useCallback((node: Text) => {
    if (applying.current) return;
    let original = originalText.current.get(node);
    if (original === undefined) {
      original = node.data;
      originalText.current.set(node, original);
    } else {
      const expected = translatePhrase(original, localeRef.current);
      if (node.data !== expected && node.data !== original) {
        original = node.data;
        originalText.current.set(node, original);
      }
    }
    const translated = translatePhrase(original, localeRef.current);
    if (node.data !== translated) node.data = translated;
  }, []);

  const translateElement = useCallback((element: Element) => {
    let originals = originalAttributes.current.get(element);
    if (!originals) {
      originals = new Map();
      originalAttributes.current.set(element, originals);
    }
    for (const attribute of attributes) {
      const current = element.getAttribute(attribute);
      if (!current) continue;
      let original = originals.get(attribute);
      if (original === undefined) {
        original = current;
        originals.set(attribute, original);
      } else {
        const expected = translatePhrase(original, localeRef.current);
        if (current !== expected && current !== original) {
          original = current;
          originals.set(attribute, original);
        }
      }
      const translated = translatePhrase(original, localeRef.current);
      if (current !== translated) element.setAttribute(attribute, translated);
    }
  }, []);

  const translateTree = useCallback((root: Node) => {
    applying.current = true;
    try {
      if (root.nodeType === Node.TEXT_NODE) translateTextNode(root as Text);
      if (root.nodeType === Node.ELEMENT_NODE) translateElement(root as Element);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let node = walker.nextNode();
      while (node) {
        if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text);
        else translateElement(node as Element);
        node = walker.nextNode();
      }
    } finally {
      applying.current = false;
    }
  }, [translateElement, translateTextNode]);

  useEffect(() => {
    activeLocale = locale;
    localeRef.current = locale;
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    translateTree(document.body);
    window.dispatchEvent(new CustomEvent('payroll:locale-change', { detail: locale }));
  }, [locale, translateTree]);

  useEffect(() => {
    const observer = new MutationObserver(records => {
      if (applying.current) return;
      for (const record of records) {
        if (record.type === 'characterData') translateTextNode(record.target as Text);
        if (record.type === 'attributes' && record.target instanceof Element) {
          translateElement(record.target);
        }
        for (const node of record.addedNodes) translateTree(node);
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...attributes],
    });
    return () => observer.disconnect();
  }, [translateElement, translateTextNode, translateTree]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  const t = useCallback((phrase: string, variables: Record<string, string | number> = {}) => {
    let translated = translatePhrase(phrase, localeRef.current);
    for (const [key, value] of Object.entries(variables)) {
      translated = translated.replaceAll(`{{${key}}}`, String(value));
    }
    return translated;
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    intlLocale: localeMeta[locale].intl,
    setLocale,
    t,
  }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
