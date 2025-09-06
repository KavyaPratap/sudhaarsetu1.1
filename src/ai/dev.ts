import { config } from 'dotenv';
config();

import '@/ai/flows/filter-false-complaints.ts';
import '@/ai/flows/calculate-urgency-score.ts';
import '@/ai/flows/translate-text.ts';
import '@/ai/flows/analyze-issue.ts';
import '@/ai/flows/parse-command.ts';
