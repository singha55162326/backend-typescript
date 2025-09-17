// src/types/i18next.d.ts
import 'i18next';

declare module 'i18next' {
  interface InitOptions {
    lng?: string;
    supportedLngs?: string[];
  }
}