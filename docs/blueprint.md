# **App Name**: OfflineTube

## Core Features:

- Video Grid Display: Display a responsive grid of videos from a YouTube channel, fetched using the YouTube API, with video details like title, duration, and upload date.
- Video Selection System: Implement a system for users to select videos for download, with options for individual selection via checkboxes and bulk selection options based on playlist or date range.
- Quality Management: Allow users to select the desired video quality (e.g., 480p, 720p, 1080p) for each video, with a global quality setting and per-video quality overrides.
- Download Management: Queue the video for download using the yt-dlp library via a WebAssembly interface, allowing downloads directly within the browser with progress tracking.
- Configuration Settings: Provide settings for users to input their YouTube API key, choose a default video quality, and set download preferences.
- Download Path Optimization: Use a tool to suggest suitable download locations/paths that comply with iPad file management guidelines. The tool should analyze constraints imposed by iPadOS and guide users to settings to enable efficient downloading, for offline access via VLC or the default file manager app.

## Style Guidelines:

- Primary color: Light blue (#90CAF9) for a calm and trustworthy feel, hinting at digital content without being overly technical.
- Background color: Very light gray (#F0F4F8) to provide a neutral backdrop that is easy on the eyes for prolonged use.
- Accent color: Deep orange (#E64A19) to draw attention to important actions such as downloading and selection, complementing the primary blue.
- Body and headline font: 'Inter', sans-serif, for a modern, clean, and readable user interface.
- Use 'lucide-svelte' icons for a consistent and clean visual language across the app.
- Implement a responsive grid layout for video thumbnails, adapting from 1 to 4 columns based on screen size.
- Use subtle animations for transitions and loading states to enhance the user experience, such as fade-ins for thumbnails and progress bar updates.