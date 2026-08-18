import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';

const clientEmail =
  process.env.GCP_CLIENT_EMAIL ||
  process.env.FIREBASE_CLIENT_EMAIL;

const rawPrivateKey =
  process.env.GCP_PRIVATE_KEY ||
  process.env.FIREBASE_PRIVATE_KEY;

const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : undefined;

const vertexConfig: any = {
  projectId: process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'sudharsetu-5d201',
  location: process.env.GCP_LOCATION || 'us-central1',
};

if (clientEmail && privateKey && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
  vertexConfig.googleAuth = {
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  };
}

export const ai = genkit({
  plugins: [vertexAI(vertexConfig)],
  model: 'vertexai/gemini-2.5-flash',
});
