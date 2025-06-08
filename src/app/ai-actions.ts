"use server";

import { suggestDownloadPath, type SuggestDownloadPathInput, type SuggestDownloadPathOutput } from '@/ai/flows/suggest-download-path';
import { z } from 'zod';

const SuggestDownloadPathActionInputSchema = z.object({
  filename: z.string().min(1, "Filename cannot be empty."),
});

export async function getSuggestedDownloadPathAction(
  input: SuggestDownloadPathInput
): Promise<SuggestDownloadPathOutput | { error: string }> {
  const parsedInput = SuggestDownloadPathActionInputSchema.safeParse(input);

  if (!parsedInput.success) {
    // Collect all error messages
    const errorMessages = parsedInput.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    console.error("Invalid input for suggestDownloadPath:", errorMessages);
    return { error: `Invalid input: ${errorMessages}` };
  }
  
  try {
    const result = await suggestDownloadPath(parsedInput.data);
    return result;
  } catch (error) {
    console.error("Error calling suggestDownloadPath AI flow:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { error: `Failed to get download path suggestion: ${errorMessage}` };
  }
}
