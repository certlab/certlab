# Internationalization (i18n) Implementation Guide

## Overview

CertLab now supports full internationalization (i18n) for all user-facing content and learning materials. The system is built on `i18next` and `react-i18next`, with custom Firestore integration for translating quizzes, questions, lectures, and other learning content.

## Features

✅ **Multi-language UI** - All UI elements translated (English, Spanish, easily extensible)
✅ **Content Translation** - Quizzes, questions, lectures, categories can be translated
✅ **Language Switcher** - Easy-to-use dropdown in header
✅ **Translation Editor** - Built-in editor for content authors
✅ **Firestore Storage** - Translations stored in Firestore subcollections
✅ **Automatic Fallback** - Falls back to English if translation missing
✅ **Persistent Preference** - Language choice saved in localStorage
✅ **TypeScript Support** - Fully typed translation keys and content

## Quick Start

### 1. Using Translations in Components

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.dashboard')}</h1>
      <button>{t('common.save')}</button>
      <p>{t('validation.minLength', { min: 5 })}</p>
    </div>
  );
}
```

### 2. Adding New Translation Keys

1. Add to `client/src/locales/en/translation.json`:
```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my new feature"
  }
}
```

2. Add to `client/src/locales/es/translation.json`:
```json
{
  "myFeature": {
    "title": "Mi Característica",
    "description": "Esta es mi nueva característica"
  }
}
```

3. Use in your component:
```tsx
const { t } = useTranslation();
return <h1>{t('myFeature.title')}</h1>;
```

### 3. Translating Content (Quizzes, Lectures, etc.)

#### Using the TranslationEditor Component

```tsx
import { TranslationEditor } from '@/components/TranslationEditor';

function MyQuizBuilder() {
  return (
    <TranslationEditor
      entityType="quiz"
      entityId={quizId}
      fields={[
        {
          name: 'title',
          label: 'Quiz Title',
          type: 'text',
          placeholder: 'Enter translated title...',
        },
        {
          name: 'description',
          label: 'Quiz Description',
          type: 'textarea',
          placeholder: 'Enter translated description...',
        },
      ]}
    />
  );
}
```

#### Using Translation Hooks

```tsx
import { useTranslatedContent } from '@/hooks/use-translated-content';

function QuizDisplay({ quiz }) {
  const { content, isLoading } = useTranslatedContent(
    'quiz',
    quiz.id,
    quiz,
    userId
  );
  
  return (
    <div>
      <h1>{content.title}</h1>
      <p>{content.description}</p>
    </div>
  );
}
```

#### Using Translation Service Directly

```tsx
import { saveTranslation, getTranslation } from '@/lib/translation-service';

// Save a translation
await saveTranslation(
  'quiz',           // entity type
  quizId,           // entity ID
  'es',             // language code
  {
    title: 'Mi Cuestionario',
    description: 'Una descripción en español',
  },
  userId
);

// Get a translation
const translation = await getTranslation(
  'quiz',
  quizId,
  'es',
  userId
);
```

## Supported Languages

Currently supported languages:
- **English (en)** - Default language
- **Spanish (es)** - Full translation

### Adding a New Language

1. Create translation file: `client/src/locales/{code}/translation.json`
2. Add to `client/src/lib/i18n.ts`:
```ts
import fr from '@/locales/fr/translation.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' }, // New language
] as const;

i18n.init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr }, // New language
  },
  // ...
});
```

3. Update schema.ts:
```ts
export const supportedLanguageSchema = z.enum(['en', 'es', 'fr']);
```

## Translation Keys Structure

```
common           - Common actions (save, cancel, edit, delete, etc.)
nav              - Navigation labels
header           - Header-specific UI elements
quiz             - Quiz-related UI
quizBuilder      - Quiz builder interface
materialEditor   - Material editor interface
achievements     - Achievement-related UI
leaderboard      - Leaderboard UI
analytics        - Analytics dashboard
errors           - Error messages
validation       - Form validation messages
feedback         - User feedback messages
```

## Translatable Entities

The following content types support translations:

- **Quiz** - title, description
- **Question** - text, options, explanation, explanationSteps
- **Lecture** - title, description, content
- **Category** - name, description
- **Subcategory** - name, description

## Firestore Structure

Translations are stored in Firestore subcollections:

```
/users/{userId}/quizzes/{quizId}/translations/{languageCode}
/questions/{questionId}/translations/{languageCode}
/users/{userId}/lectures/{lectureId}/translations/{languageCode}
/categories/{categoryId}/translations/{languageCode}
/subcategories/{subcategoryId}/translations/{languageCode}
```

Each translation document contains:
```ts
{
  languageCode: 'es',
  title: 'Translated Title',
  description: 'Translated Description',
  content: 'Translated Content',
  updatedAt: Timestamp,
  updatedBy: 'userId',
}
```

## Best Practices

### 1. Always Use Translation Keys
❌ **Don't hardcode text:**
```tsx
<button>Save</button>
```

✅ **Use translation keys:**
```tsx
<button>{t('common.save')}</button>
```

### 2. Provide Context with Namespaces
Use descriptive namespaces to organize translations:
```tsx
t('quizBuilder.validation.titleRequired')  // Clear context
t('validation.required')                    // Generic
```

### 3. Use Interpolation for Dynamic Values
```tsx
t('validation.minLength', { min: 5 })
// English: "Must be at least 5 characters"
// Spanish: "Debe tener al menos 5 caracteres"
```

### 4. Handle Pluralization
```json
{
  "items": {
    "one": "{{count}} item",
    "other": "{{count}} items"
  }
}
```

```tsx
t('items', { count: 1 })  // "1 item"
t('items', { count: 5 })  // "5 items"
```

### 5. Provide Fallback Values
```tsx
t('new.feature', { defaultValue: 'New Feature' })
```

## Testing

Run i18n tests:
```bash
npm run test:run -- client/src/lib/i18n.test.ts
```

Test coverage:
- ✅ Language initialization
- ✅ Language switching
- ✅ Translation retrieval
- ✅ Interpolation
- ✅ Fallback behavior
- ✅ Missing key handling

## Demo

Visit `/app/i18n-demo` to see the i18n system in action:
- Live language switching
- Translation examples
- Translation editor demo
- Feature documentation

## API Reference

### Translation Hooks

#### `useTranslation()`
From react-i18next. Main hook for UI translations.

```tsx
const { t, i18n } = useTranslation();
t('common.save')                    // Get translation
i18n.changeLanguage('es')            // Change language
i18n.language                        // Current language
```

#### `useTranslatedContent()`
Custom hook for loading translated entity content.

```tsx
const { content, isLoading, isTranslated, currentLanguage } = useTranslatedContent(
  'quiz',      // entityType
  quizId,      // entityId
  quiz,        // baseContent (English)
  userId       // userId (for user-specific content)
);
```

#### `useTranslatedField()`
Custom hook for loading a single translated field.

```tsx
const translatedTitle = useTranslatedField(
  'quiz',
  quizId,
  'title',
  quiz.title,  // default value
  userId
);
```

### Translation Service Functions

#### `saveTranslation()`
Save or update a translation.

```tsx
await saveTranslation(
  entityType: TranslatableEntity,
  entityId: string,
  languageCode: SupportedLanguage,
  translation: Partial<Translation>,
  userId?: string
): Promise<void>
```

#### `getTranslation()`
Get a specific translation.

```tsx
const translation = await getTranslation(
  entityType: TranslatableEntity,
  entityId: string,
  languageCode: SupportedLanguage,
  userId?: string
): Promise<Translation | null>
```

#### `getAllTranslations()`
Get all translations for an entity.

```tsx
const translations = await getAllTranslations(
  entityType: TranslatableEntity,
  entityId: string,
  userId?: string
): Promise<Record<SupportedLanguage, Translation>>
```

#### `hasTranslation()`
Check if a translation exists.

```tsx
const exists = await hasTranslation(
  entityType: TranslatableEntity,
  entityId: string,
  languageCode: SupportedLanguage,
  userId?: string
): Promise<boolean>
```

#### `deleteTranslation()`
Delete a translation.

```tsx
await deleteTranslation(
  entityType: TranslatableEntity,
  entityId: string,
  languageCode: SupportedLanguage,
  userId?: string
): Promise<void>
```

## Troubleshooting

### Translation not showing

1. Check if key exists in translation file
2. Verify i18n is initialized in main.tsx
3. Check browser console for errors
4. Verify language code is correct

### Translation not loading from Firestore

1. Check Firestore rules allow reading translations subcollection
2. Verify entity ID is correct
3. Check user ID is provided for user-specific content
4. Verify translation document exists in Firestore

### Language not persisting

1. Check localStorage is enabled in browser
2. Verify `i18nextLng` key exists in localStorage
3. Check for console errors related to localStorage

## Contributing

When adding new features:

1. ✅ Add translation keys for all user-facing text
2. ✅ Provide translations for all supported languages
3. ✅ Use existing translation namespaces when possible
4. ✅ Add tests for new translation keys
5. ✅ Update this documentation if needed

## Resources

- [i18next Documentation](https://www.i18next.com/)
- [react-i18next Documentation](https://react.i18next.com/)
- [Demo Page](/app/i18n-demo)
- [Translation Service Source](client/src/lib/translation-service.ts)
- [i18n Configuration](client/src/lib/i18n.ts)
