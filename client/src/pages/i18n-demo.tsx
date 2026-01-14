/**
 * i18n Demo Page
 *
 * Demonstrates the localization/translation functionality
 */

import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { TranslationEditor } from '@/components/TranslationEditor';
import { Check, Globe } from 'lucide-react';

export default function I18nDemo() {
  const { t, i18n } = useTranslation();

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">{t('common.dashboard')}</h1>
          <p className="text-muted-foreground mt-2">Internationalization (i18n) Demo</p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Current Language Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Current Language
          </CardTitle>
          <CardDescription>
            Active language:{' '}
            {SUPPORTED_LANGUAGES.find((lang) => lang.code === i18n.language)?.nativeName ||
              'English'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <Button
                key={lang.code}
                variant={i18n.language === lang.code ? 'default' : 'outline'}
                onClick={() => i18n.changeLanguage(lang.code)}
              >
                {lang.nativeName}
                {i18n.language === lang.code && <Check className="w-4 h-4 ml-2" />}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* UI Translation Examples */}
      <Card>
        <CardHeader>
          <CardTitle>UI Translation Examples</CardTitle>
          <CardDescription>Common UI elements in the current language</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Common Actions</h3>
              <ul className="space-y-1 text-sm">
                <li>• {t('common.save')}</li>
                <li>• {t('common.cancel')}</li>
                <li>• {t('common.edit')}</li>
                <li>• {t('common.delete')}</li>
                <li>• {t('common.create')}</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Navigation</h3>
              <ul className="space-y-1 text-sm">
                <li>• {t('nav.dashboard')}</li>
                <li>• {t('nav.quiz')}</li>
                <li>• {t('nav.materials')}</li>
                <li>• {t('nav.achievements')}</li>
                <li>• {t('nav.leaderboard')}</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Quiz Builder</h3>
              <ul className="space-y-1 text-sm">
                <li>• {t('quizBuilder.title')}</li>
                <li>• {t('quizBuilder.createNew')}</li>
                <li>• {t('quizBuilder.addQuestion')}</li>
                <li>• {t('quizBuilder.saveQuiz')}</li>
                <li>• {t('quizBuilder.preview')}</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Validation</h3>
              <ul className="space-y-1 text-sm">
                <li>• {t('validation.required')}</li>
                <li>• {t('validation.email')}</li>
                <li>• {t('validation.minLength', { min: 5 })}</li>
                <li>• {t('validation.numeric')}</li>
                <li>• {t('validation.positive')}</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Feedback</h3>
              <ul className="space-y-1 text-sm">
                <li>• {t('feedback.correct')}</li>
                <li>• {t('feedback.incorrect')}</li>
                <li>• {t('feedback.greatJob')}</li>
                <li>• {t('feedback.keepGoing')}</li>
                <li>• {t('feedback.wellDone')}</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Errors</h3>
              <ul className="space-y-1 text-sm">
                <li>• {t('errors.generic')}</li>
                <li>• {t('errors.notFound')}</li>
                <li>• {t('errors.unauthorized')}</li>
                <li>• {t('errors.networkError')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supported Languages */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Languages</CardTitle>
          <CardDescription>
            Currently supporting {SUPPORTED_LANGUAGES.length} languages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <Badge key={lang.code} variant="secondary" className="text-sm">
                {lang.nativeName} ({lang.code.toUpperCase()})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Translation Editor Demo */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Translation Editor (For Content Authors)</h2>
        <p className="text-muted-foreground mb-4">
          Content authors can use the translation editor to add translations for quizzes, questions,
          and learning materials.
        </p>
        <TranslationEditor
          entityType="quiz"
          entityId="demo-quiz-1"
          fields={[
            {
              name: 'title',
              label: t('quizBuilder.quizTitle'),
              type: 'text',
              placeholder: 'Enter translated title...',
            },
            {
              name: 'description',
              label: t('quizBuilder.quizDescription'),
              type: 'textarea',
              placeholder: 'Enter translated description...',
            },
          ]}
        />
      </div>

      {/* Features List */}
      <Card>
        <CardHeader>
          <CardTitle>Localization Features</CardTitle>
          <CardDescription>Comprehensive i18n support for the entire application</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <strong>UI Language Switcher:</strong> Easy-to-use language selector in the header
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <strong>Multiple Languages:</strong> Support for English and Spanish (easily
                extensible)
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <strong>Content Translation:</strong> Quizzes, questions, lectures, and materials
                can be translated
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <strong>Translation Editor:</strong> Built-in editor for content authors to manage
                translations
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <strong>Firestore Storage:</strong> Translations stored in Firestore subcollections
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <strong>Automatic Fallback:</strong> Falls back to English if translation is missing
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <strong>Persistent Language:</strong> Language preference saved in localStorage
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <strong>React Hooks:</strong> Custom hooks for translated content
                (useTranslatedContent, useTranslatedField)
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
