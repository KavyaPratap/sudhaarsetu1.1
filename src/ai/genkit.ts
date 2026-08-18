import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';

export const ai = genkit({
  plugins: [
    vertexAI({
      projectId: process.env.GCP_PROJECT_ID || 'quesper-2e352',
      location: process.env.GCP_LOCATION || 'us-central1',
    }),
  ],
  model: 'vertexai/gemini-2.5-flash',
});
