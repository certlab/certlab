/**
 * Translation Service for CertLab
 *
 * Handles storage and retrieval of translations for learning materials
 * using Firestore subcollections pattern:
 * - parentDoc/translations/{languageCode}
 *
 * Supports translations for:
 * - Quizzes (title, description)
 * - Questions (text, options, explanation)
 * - Lectures (title, description, content)
 * - Categories (name, description)
 */

import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { getFirestoreInstance } from './firestore-service';
import { logError } from './errors';
import type { Translation, SupportedLanguage } from '@shared/schema';

/**
 * Entity types that support translations
 */
export type TranslatableEntity = 'quiz' | 'question' | 'lecture' | 'category' | 'subcategory';

/**
 * Get collection path for an entity type
 */
function getCollectionPath(entityType: TranslatableEntity, userId?: string): string {
  switch (entityType) {
    case 'quiz':
      if (!userId) throw new Error('userId required for quiz translations');
      return `users/${userId}/quizzes`;
    case 'lecture':
      if (!userId) throw new Error('userId required for lecture translations');
      return `users/${userId}/lectures`;
    case 'question':
      return 'questions';
    case 'category':
      return 'categories';
    case 'subcategory':
      return 'subcategories';
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
}

/**
 * Save a translation for an entity
 */
export async function saveTranslation(
  entityType: TranslatableEntity,
  entityId: string,
  languageCode: SupportedLanguage,
  translation: Partial<Translation>,
  userId?: string
): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const collectionPath = getCollectionPath(entityType, userId);

    // Reference to the parent document
    const docRef = doc(db, collectionPath, entityId);

    // Reference to the translation document
    const translationRef = doc(collection(docRef, 'translations'), languageCode);

    // Save the translation
    await setDoc(translationRef, {
      languageCode,
      ...translation,
      updatedAt: Timestamp.now(),
      updatedBy: userId || 'system',
    });

    // Update parent document to indicate translations exist
    const parentDoc = await getDoc(docRef);
    if (parentDoc.exists()) {
      const currentLanguages = parentDoc.data().availableLanguages || [];
      if (!currentLanguages.includes(languageCode)) {
        await updateDoc(docRef, {
          hasTranslations: true,
          availableLanguages: arrayUnion(languageCode),
        });
      }
    }
  } catch (error) {
    logError('saveTranslation', error, { entityType, entityId, languageCode });
    throw error;
  }
}

/**
 * Get a specific translation for an entity
 */
export async function getTranslation(
  entityType: TranslatableEntity,
  entityId: string,
  languageCode: SupportedLanguage,
  userId?: string
): Promise<Translation | null> {
  try {
    const db = getFirestoreInstance();
    const collectionPath = getCollectionPath(entityType, userId);

    const docRef = doc(db, collectionPath, entityId);
    const translationRef = doc(collection(docRef, 'translations'), languageCode);

    const translationDoc = await getDoc(translationRef);

    if (!translationDoc.exists()) {
      return null;
    }

    const data = translationDoc.data();
    return {
      languageCode: data.languageCode,
      title: data.title,
      description: data.description,
      content: data.content,
      text: data.text,
      options: data.options,
      explanation: data.explanation,
      explanationSteps: data.explanationSteps,
      updatedAt: data.updatedAt?.toDate() || new Date(),
      updatedBy: data.updatedBy,
    } as Translation;
  } catch (error) {
    logError('getTranslation', error, { entityType, entityId, languageCode });
    return null;
  }
}

/**
 * Get all translations for an entity
 */
export async function getAllTranslations(
  entityType: TranslatableEntity,
  entityId: string,
  userId?: string
): Promise<Record<SupportedLanguage, Translation>> {
  try {
    const db = getFirestoreInstance();
    const collectionPath = getCollectionPath(entityType, userId);

    const docRef = doc(db, collectionPath, entityId);
    const translationsRef = collection(docRef, 'translations');

    const snapshot = await getDocs(translationsRef);
    const translations: Record<string, Translation> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      translations[doc.id] = {
        languageCode: data.languageCode,
        title: data.title,
        description: data.description,
        content: data.content,
        text: data.text,
        options: data.options,
        explanation: data.explanation,
        explanationSteps: data.explanationSteps,
        updatedAt: data.updatedAt?.toDate() || new Date(),
        updatedBy: data.updatedBy,
      } as Translation;
    });

    return translations as Record<SupportedLanguage, Translation>;
  } catch (error) {
    logError('getAllTranslations', error, { entityType, entityId });
    return {} as Record<SupportedLanguage, Translation>;
  }
}

/**
 * Check if a translation exists for an entity
 */
export async function hasTranslation(
  entityType: TranslatableEntity,
  entityId: string,
  languageCode: SupportedLanguage,
  userId?: string
): Promise<boolean> {
  try {
    const db = getFirestoreInstance();
    const collectionPath = getCollectionPath(entityType, userId);

    const docRef = doc(db, collectionPath, entityId);
    const translationRef = doc(collection(docRef, 'translations'), languageCode);

    const translationDoc = await getDoc(translationRef);
    return translationDoc.exists();
  } catch (error) {
    logError('hasTranslation', error, { entityType, entityId, languageCode });
    return false;
  }
}

/**
 * Delete a translation for an entity
 */
export async function deleteTranslation(
  entityType: TranslatableEntity,
  entityId: string,
  languageCode: SupportedLanguage,
  userId?: string
): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const collectionPath = getCollectionPath(entityType, userId);

    const docRef = doc(db, collectionPath, entityId);
    const translationRef = doc(collection(docRef, 'translations'), languageCode);

    // Delete the translation document
    await setDoc(translationRef, { _deleted: true });

    // Update parent document
    const allTranslations = await getAllTranslations(entityType, entityId, userId);
    const remainingLanguages = Object.keys(allTranslations).filter((lang) => lang !== languageCode);

    await updateDoc(docRef, {
      hasTranslations: remainingLanguages.length > 0,
      availableLanguages: remainingLanguages,
    });
  } catch (error) {
    logError('deleteTranslation', error, { entityType, entityId, languageCode });
    throw error;
  }
}
