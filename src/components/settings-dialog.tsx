"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppContext } from '@/store/app-context';
import type { AppSettings } from '@/types';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function SettingsDialog({ isOpen, onOpenChange }: SettingsDialogProps) {
  const { state, dispatch } = useAppContext();
  const [localSettings, setLocalSettings] = useState<AppSettings>(state.settings);
  const { toast } = useToast();

  useEffect(() => {
    setLocalSettings(state.settings);
  }, [state.settings, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setLocalSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value,
    }));
  };

  const handleSelectChange = (name: keyof AppSettings, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveChanges = () => {
    if (!localSettings.apiKey) {
      toast({
        title: "API Key Missing",
        description: "Please enter your YouTube API Key.",
        variant: "destructive",
      });
      return;
    }
    if (!localSettings.channelUrl) {
      toast({
        title: "Channel URL Missing",
        description: "Please enter the YouTube Channel URL.",
        variant: "destructive",
      });
      return;
    }
    dispatch({ type: 'UPDATE_SETTINGS', payload: localSettings });
    toast({
      title: "Settings Saved",
      description: "Your settings have been updated.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="font-headline">App Settings</DialogTitle>
          <DialogDescription>
            Configure your preferences for OfflineTube. API Key and Channel URL are required.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="apiKey" className="text-right col-span-1">
              API Key
            </Label>
            <Input
              id="apiKey"
              name="apiKey"
              type="password"
              value={localSettings.apiKey}
              onChange={handleInputChange}
              className="col-span-3"
              placeholder="Enter YouTube API Key"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="channelUrl" className="text-right col-span-1">
              Channel URL
            </Label>
            <Input
              id="channelUrl"
              name="channelUrl"
              value={localSettings.channelUrl}
              onChange={handleInputChange}
              className="col-span-3"
              placeholder="e.g., https://www.youtube.com/@YourChannel"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="defaultQuality" className="text-right col-span-1">
              Default Quality
            </Label>
            <Select
              name="defaultQuality"
              value={localSettings.defaultQuality}
              onValueChange={(value) => handleSelectChange('defaultQuality', value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1080p">1080p</SelectItem>
                <SelectItem value="720p">720p</SelectItem>
                <SelectItem value="480p">480p</SelectItem>
                <SelectItem value="360p">360p</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="downloadPathPreference" className="text-right col-span-1">
              Download Path
            </Label>
            <Input
              id="downloadPathPreference"
              name="downloadPathPreference"
              value={localSettings.downloadPathPreference}
              onChange={handleInputChange}
              className="col-span-3"
              placeholder="e.g., /Downloads/OfflineTube"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="concurrentDownloads" className="text-right col-span-1">
              Concurrent Downloads
            </Label>
            <Input
              id="concurrentDownloads"
              name="concurrentDownloads"
              type="number"
              value={localSettings.concurrentDownloads}
              onChange={handleInputChange}
              min="1"
              max="5"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveChanges} className="bg-primary hover:bg-primary/90 text-primary-foreground">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
