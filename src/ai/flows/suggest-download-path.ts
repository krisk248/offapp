'use server';

/**
 * @fileOverview A download path suggestion AI agent.
 *
 * - suggestDownloadPath - A function that handles the download path suggestion process.
 * - SuggestDownloadPathInput - The input type for the suggestDownloadPath function.
 * - SuggestDownloadPathOutput - The return type for the suggestDownloadPath function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDownloadPathInputSchema = z.object({
  filename: z.string().describe('The name of the video file to be downloaded.'),
});
export type SuggestDownloadPathInput = z.infer<typeof SuggestDownloadPathInputSchema>;

const SuggestDownloadPathOutputSchema = z.object({
  suggestedPath: z.string().describe('The suggested download path optimized for iPadOS, considering compatibility with VLC and the Files app.'),
  instructions: z.string().describe('Instructions to configure iPadOS for downloads and access via VLC or Files app.'),
});
export type SuggestDownloadPathOutput = z.infer<typeof SuggestDownloadPathOutputSchema>;

export async function suggestDownloadPath(input: SuggestDownloadPathInput): Promise<SuggestDownloadPathOutput> {
  return suggestDownloadPathFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDownloadPathPrompt',
  input: {schema: SuggestDownloadPathInputSchema},
  output: {schema: SuggestDownloadPathOutputSchema},
  prompt: `You are an expert in iPadOS file management and video playback using VLC. A user is downloading a video with the filename "{{{filename}}}" and needs a suitable download path for easy access in VLC or the Files app.

  Suggest an optimal download path, considering iPadOS constraints. Also, provide clear instructions on how to configure iPadOS for downloads and access the files via VLC or the Files app. The instructions should be tailored for less tech-savvy users.

  Format the output as a JSON object with 'suggestedPath' and 'instructions' fields.`, 
});

const suggestDownloadPathFlow = ai.defineFlow(
  {
    name: 'suggestDownloadPathFlow',
    inputSchema: SuggestDownloadPathInputSchema,
    outputSchema: SuggestDownloadPathOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
