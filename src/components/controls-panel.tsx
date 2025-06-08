"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Search, ListFilter, CalendarRange, CheckSquare, XSquare } from 'lucide-react';
import { useAppContext } from '@/store/app-context';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function ControlsPanel() {
  const { state, dispatch } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  // playlistFilter now managed by state.selectedPlaylistId
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const handleSelectAll = () => dispatch({ type: 'SELECT_ALL_VIDEOS' });
  const handleDeselectAll = () => dispatch({ type: 'DESELECT_ALL_VIDEOS' });

  const qualityOptions = ['1080p', '720p', '480p', '360p'];

  const handlePlaylistChange = (playlistId: string) => {
    dispatch({ type: 'SET_SELECTED_PLAYLIST_ID', payload: playlistId === 'all' ? null : playlistId });
  };
  
  // Effect to handle client-side values after hydration
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  // Filter videos based on searchTerm (client-side for now)
  // This is a simple example; more complex filtering might involve debouncing or server-side logic
  const filteredVideos = state.videos.filter(video => 
    video.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // Note: if you want search to affect the VideoGrid directly, this state management needs to be in AppContext

  return (
    <Card className="p-4 sm:p-6 shadow-md rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        {/* Search Input */}
        <div className="space-y-1.5">
          <Label htmlFor="search" className="text-sm font-medium">Search Videos</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="search"
              type="search"
              placeholder="Filter by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </div>

        {/* Quality Selector (Global) */}
        <div className="space-y-1.5">
          <Label htmlFor="globalQuality" className="text-sm font-medium">Global Quality</Label>
          <Select
            value={state.globalQuality}
            onValueChange={(value) => dispatch({ type: 'SET_GLOBAL_QUALITY', payload: value })}
          >
            <SelectTrigger id="globalQuality" className="h-11">
              <SelectValue placeholder="Set quality" />
            </SelectTrigger>
            <SelectContent>
              {qualityOptions.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        
        {/* Playlist Filter */}
        <div className="space-y-1.5">
          <Label htmlFor="playlistFilter" className="text-sm font-medium">Filter by Playlist</Label>
          <Select
            value={state.selectedPlaylistId || 'all'}
            onValueChange={handlePlaylistChange}
            disabled={state.isLoadingPlaylists || state.playlists.length === 0}
          >
            <SelectTrigger id="playlistFilter" className="h-11">
              <ListFilter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder={state.isLoadingPlaylists ? "Loading playlists..." : "Filter by playlist"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channel Videos</SelectItem>
              {state.playlists.map(p => <SelectItem key={p.id} value={p.id}>{p.title} ({p.itemCount})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter (UI only for now) */}
        <div className="space-y-1.5">
            <Label htmlFor="dateRange" className="text-sm font-medium">Filter by Date (Uploaded)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="dateRange"
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-11"
                >
                  <CalendarRange className="mr-2 h-4 w-4 text-muted-foreground" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                 {currentDate && (
                    <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={currentDate} // Use a non-null date
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    />
                 )}
              </PopoverContent>
            </Popover>
          </div>

        {/* Bulk Selection Buttons */}
        <div className="md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row gap-3 pt-2">
          <Button onClick={handleSelectAll} variant="outline" className="flex-1 h-11 text-sm" disabled={filteredVideos.length === 0}>
            <CheckSquare className="mr-2 h-4 w-4" /> Select All Visible
          </Button>
          <Button onClick={handleDeselectAll} variant="outline" className="flex-1 h-11 text-sm" disabled={state.selectedVideos.size === 0}>
            <XSquare className="mr-2 h-4 w-4" /> Deselect All
          </Button>
        </div>
      </div>
    </Card>
  );
}
