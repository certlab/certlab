/**
 * Translation Editor Component
 *
 * Allows editing translations for quizzes, questions, lectures, and other content.
 * Displays a language selector and editable fields for translated content.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-provider';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { saveTranslation, getTranslation } from '@/lib/translation-service';
import type { TranslatableEntity } from '@/lib/translation-service';
import type { SupportedLanguage, Translation } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Languages, Save, AlertCircle } from 'lucide-react';

interface TranslationEditorProps {
  entityType: TranslatableEntity;
  entityId: string;
  fields: Array<{
    name: keyof Translation;
    label: string;
    type: 'text' | 'textarea';
    placeholder?: string;
  }>;
}

export function TranslationEditor({ entityType, entityId, fields }: TranslationEditorProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('es');
  const [translationData, setTranslationData] = useState<Partial<Translation>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Filter out English from available languages
  const availableLanguages = SUPPORTED_LANGUAGES.filter((lang) => lang.code !== 'en');

  // Load translation when language changes
  useEffect(() => {
    const loadTranslation = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        const translation = await getTranslation(entityType, entityId, selectedLanguage, user.id);

        if (translation) {
          setTranslationData(translation);
        } else {
          // Initialize empty translation
          setTranslationData({});
        }
      } catch (error) {
        console.error('Error loading translation:', error);
        toast({
          title: 'Error',
          description: 'Failed to load translation',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslation();
    setHasChanges(false);
  }, [selectedLanguage, entityType, entityId, user?.id, toast]);

  const handleFieldChange = (fieldName: keyof Translation, value: string) => {
    setTranslationData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      await saveTranslation(entityType, entityId, selectedLanguage, translationData, user.id);

      toast({
        title: t('common.success', { defaultValue: 'Success' }),
        description: t('quizBuilder.validation.saveSuccess'),
      });

      setHasChanges(false);
    } catch (error) {
      console.error('Error saving translation:', error);
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description: t('quizBuilder.validation.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="w-5 h-5" />
          {t('quizBuilder.editTranslation')}
        </CardTitle>
        <CardDescription>
          {t('quizBuilder.language')}: {t('header.languageSelector')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Language Selector */}
        <div className="space-y-2">
          <Label>{t('quizBuilder.language')}</Label>
          <Select
            value={selectedLanguage}
            onValueChange={(value) => setSelectedLanguage(value as SupportedLanguage)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Translation Fields */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-4">{t('common.loading')}</div>
        ) : (
          <>
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={`translation-${field.name}`}>{field.label}</Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={`translation-${field.name}`}
                    value={(translationData[field.name] as string) || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                  />
                ) : (
                  <Input
                    id={`translation-${field.name}`}
                    value={(translationData[field.name] as string) || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}

            {/* Save Button */}
            <div className="flex items-center gap-2 pt-4">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? t('common.saving', { defaultValue: 'Saving...' }) : t('common.save')}
              </Button>
              {hasChanges && (
                <span className="text-sm text-muted-foreground">
                  {t('common.unsavedChanges', { defaultValue: 'Unsaved changes' })}
                </span>
              )}
            </div>

            {/* Info Alert */}
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{t('quizBuilder.fallbackToEnglish')}</AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}
