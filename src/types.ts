export interface VideoItem {
  id: string; // our internal uuid
  youtubeId: string;
  url: string;
  tags: string[]; // tag IDs
  addedAt: number;
  startTime?: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface ClipProject {
  id: string;
  name: string;
  createdAt: number;
}

export interface ClipItem {
  id: string;
  projectId: string;
  youtubeId: string;
  url: string;
  startTime: number;
  endTime: number;
  loop: boolean;
  addedAt: number;
  title: string;
  type?: 'video' | 'image';
  zoomDuration?: number; // in seconds
}
