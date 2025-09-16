#!/usr/bin/env node

/**
 * Translation Management CLI Tool
 * 
 * This script provides a command-line interface for managing translations
 * in the stadium booking system.
 * 
 * Usage:
 *   npm run translation-manager -- [command] [options]
 * 
 * Commands:
 *   stats          Display translation statistics
 *   missing        Show missing translations
 *   report         Generate a full translation report
 *   help           Show help information
 */

import { generateTranslationReport, displayTranslationStatistics, displayMissingTranslations } from '../utils/translation-utils';

// Import i18n configuration to initialize the translation system
import '../config/i18n';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  try {
    switch (command) {
      case 'stats':
        await displayTranslationStatistics();
        break;
        
      case 'missing':
        await displayMissingTranslations();
        break;
        
      case 'report':
        await generateTranslationReport();
        break;
        
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

function showHelp(): void {
  console.log(`
Translation Management CLI Tool
===============================

Usage:
  npm run translation-manager -- [command] [options]

Commands:
  stats          Display translation statistics
  missing        Show missing translations
  report         Generate a full translation report
  help           Show this help information

Examples:
  npm run translation-manager -- stats
  npm run translation-manager -- missing
  npm run translation-manager -- report
  `);
}

// Run the CLI tool
if (require.main === module) {
  main();
}

export { main };