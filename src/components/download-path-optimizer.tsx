"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';
import { getSuggestedDownloadPathAction } from '@/app/ai-actions';
import { useAppContext } from '@/store/app-context';
import type { SuggestDownloadPathOutput } from '@/ai/flows/suggest-download-path';

export default function DownloadPathOptimizer() {
  const { state: appState, dispatch: appDispatch } = useAppContext();
  const [filename, setFilename] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestDownloadPathOutput | null>(null);

  // Auto-fill filename from the first selected video
  useEffect(() => {
    if (appState.selectedVideos.size > 0) {
      const firstSelectedId = Array.from(appState.selectedVideos)[0];
      const video = appState.videos.find(v => v.id === firstSelectedId);
      if (video) {
        // Simple filename generation, can be more sophisticated
        const quality = appState.videoQualities[video.id] || appState.globalQuality;
        setFilename(`${video.channelName} - ${video.title} - ${quality}.mp4`);
      }
    } else {
      setFilename(''); // Clear if no videos selected
    }
  }, [appState.selectedVideos, appState.videos, appState.videoQualities, appState.globalQuality]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename.trim()) {
      setError("Please enter a filename.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    const result = await getSuggestedDownloadPathAction({ filename });

    setIsLoading(false);
    if ('error' in result) {
      setError(result.error);
    } else {
      setSuggestion(result);
      // Optionally update global state if needed, e.g. for settings
      appDispatch({ type: 'SET_SUGGESTED_PATH', payload: {path: result.suggestedPath, instructions: result.instructions} });
    }
  };

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl font-headline flex items-center">
          <Lightbulb className="mr-2 h-6 w-6 text-primary" />
          iPad Download Path Optimizer
        </CardTitle>
        <CardDescription>
          Get suggestions for the best download path on your iPad for VLC or Files app access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="filename" className="text-sm font-medium">Video Filename</Label>
            <Input
              id="filename"
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="e.g., My Awesome Video.mp4"
              className="mt-1 h-11"
              disabled={isLoading}
            />
          </div>
          <Button type="submit" disabled={isLoading || !filename.trim()} className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Lightbulb className="mr-2 h-5 w-5" />
            )}
            Get Suggestion
          </Button>
        </form>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      {suggestion && (
        <CardFooter className="flex flex-col items-start gap-4 pt-4 border-t">
            <Alert variant="default" className="w-full bg-primary/10 border-primary/30">
              <CheckCircle className="h-5 w-5 text-primary" />
              <AlertTitle className="font-semibold text-primary">Suggested Path</AlertTitle>
              <AlertDescription className="text-sm text-primary-foreground font-mono bg-primary/20 p-2 rounded-md my-1">
                {suggestion.suggestedPath}
              </AlertDescription>
            </Alert>
            
            <div className="w-full">
                <h4 className="font-semibold text-foreground mb-2">Instructions:</h4>
                <div className="text-sm text-muted-foreground space-y-2 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 whitespace-pre-wrap p-3 border rounded-md bg-secondary/50">
                    {suggestion.instructions}
                </div>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
