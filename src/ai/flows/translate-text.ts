'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { adminDb } from '@/lib/firebase/admin';

const TranslateTextInputSchema = z.object({
  issueId: z.string().describe('The ID of the issue being translated.'),
  text: z.string().describe('The text to be translated.'),
  targetLanguage: z
    .string()
    .describe(
      'The target language to translate the text into (e.g., "hi", "en").'
    ),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

export async function translateText(
  input: TranslateTextInput
): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateTextPrompt',
  input: {
    schema: z.object({
      text: z.string(),
      targetLanguage: z.string(),
    }),
  },
  output: { schema: TranslateTextOutputSchema },
  prompt: `Translate the following text into the language represented by the code '{{targetLanguage}}'. Only return the translated text, with no additional explanation or preamble.

Text to translate:
"{{{text}}}"
`,
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async ({ issueId, text, targetLanguage }) => {
    const docId = `${issueId}_${targetLanguage}`;
    const cacheDoc = await adminDb.collection('translations').doc(docId).get();

    if (cacheDoc.exists) {
      return { translatedText: cacheDoc.data()?.translated_text || '' };
    }

    const { output } = await prompt({ text, targetLanguage });
    const translatedText = output?.translatedText || '';

    if (translatedText) {
      await adminDb.collection('translations').doc(docId).set({
        issue_id: issueId,
        language_code: targetLanguage,
        translated_text: translatedText,
        created_at: new Date().toISOString(),
      });
    }

    return { translatedText };
  }
);
