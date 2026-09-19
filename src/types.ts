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
