import { LanguageManagementService } from '../services/language-management.service';

/**
 * Utility functions for translation management
 */

/**
 * Display translation statistics
 */
export async function displayTranslationStatistics(): Promise<void> {
  console.log('=== Translation Statistics ===');
  const stats = LanguageManagementService.getTranslationStatistics();
  
  Object.entries(stats).forEach(([language, namespaces]: [string, any]) => {
    console.log(`\nLanguage: ${language}`);
    Object.entries(namespaces).forEach(([namespace, data]: [string, any]) => {
      console.log(`  ${namespace}: ${data.keyCount} keys`);
    });
  });
}

/**
 * Display missing translations
 */
export async function displayMissingTranslations(): Promise<void> {
  console.log('\n=== Missing Translations ===');
  const missing = LanguageManagementService.findMissingTranslations();
  
  if (Object.keys(missing).length === 0) {
    console.log('No missing translations found!');
    return;
  }
  
  Object.entries(missing).forEach(([language, namespaces]: [string, any]) => {
    console.log(`\nLanguage: ${language}`);
    Object.entries(namespaces).forEach(([namespace, keys]: [string, any]) => {
      console.log(`  ${namespace}:`);
      keys.forEach((key: string) => console.log(`    - ${key}`));
    });
  });
}

/**
 * Generate a translation report
 */
export async function generateTranslationReport(): Promise<void> {
  console.log('\n=== Translation Report ===');
  
  await displayTranslationStatistics();
  await displayMissingTranslations();
  
  console.log('\n=== Available Languages ===');
  const languages = LanguageManagementService.getSupportedLanguages();
  languages.forEach(lang => {
    console.log(`- ${lang.code}: ${lang.name}`);
  });
  
  console.log('\n=== Available Namespaces ===');
  const namespaces = LanguageManagementService.getAvailableNamespaces();
  namespaces.forEach(ns => {
    console.log(`- ${ns}`);
  });
}