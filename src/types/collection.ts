export type CollectionMode = 'pixiv' | 'album';

export interface Collection {
  id: string;
  name: string;
  folder: string;
  cover: string | null;
  coverPosition?: number;
  coverPositionVertical?: boolean;
  images: string[];
  mode: CollectionMode;
  createdAt?: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    timestamp: number;
  };
}

export interface CollectionData {
  collections: Collection[];
}
