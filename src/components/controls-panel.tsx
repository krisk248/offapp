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
import { Search, ListFilter, CalendarRange, CheckSquare, XSquare, ChevronDown } from 'lucide-react';
import { useAppContext } from '@/store/app-context';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function ControlsPanel() {
  const { state, dispatch } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [playlistFilter, setPlaylistFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Note: Actual filtering logic would typically be handled by dispatching actions 
  // to update the displayed video list in the context or by applying filters client-side if appropriate.
  // For this example, these are UI elements.

  const handleSelectAll = () => dispatch({ type: 'SELECT_ALL_VIDEOS' });
  const handleDeselectAll = () => dispatch({ type: 'DESELECT_ALL_VIDEOS' });

  // Mock playlists - in a real app, these would come from API data
  const playlists = ['All Playlists', 'Tutorials', 'Vlogs', 'Product Reviews'];
  const qualityOptions = ['1080p', '720p', '480p'];


  // Effect to handle client-side values after hydration
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  useEffect(() => {
    setCurrentDate(new Date());
  }, []);


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
            value={playlistFilter}
            onValueChange={setPlaylistFilter}
          >
            <SelectTrigger id="playlistFilter" className="h-11">
              <ListFilter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter by playlist" />
            </SelectTrigger>
            <SelectContent>
              {playlists.map(p => <SelectItem key={p} value={p.toLowerCase().replace(' ', '-')}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-1.5">
            <Label htmlFor="dateRange" className="text-sm font-medium">Filter by Date</Label>
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
                    defaultMonth={currentDate}
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
          <Button onClick={handleSelectAll} variant="outline" className="flex-1 h-11 text-sm">
            <CheckSquare className="mr-2 h-4 w-4" /> Select All
          </Button>
          <Button onClick={handleDeselectAll} variant="outline" className="flex-1 h-11 text-sm">
            <XSquare className="mr-2 h-4 w-4" /> Deselect All
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Dummy Card component to make it compile, assuming it's from shadcn/ui but not available in this context
const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={`bg-card text-card-foreground border rounded-lg ${className}`}>
    {children}
  </div>
);
