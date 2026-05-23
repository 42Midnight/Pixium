export interface DateInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  timestamp: number;
}

export interface WorkPrompt {
  [key: string]: string;
}

export interface WorkData {
  id: string;
  title: string;
  cover: string;
  fileName: string;
  folder?: string;
  prompt: WorkPrompt | null;
  images: string[];
  createdAt?: DateInfo;
  timestamp?: number;
  coverPosition?: number;
  coverPositionVertical?: boolean;
  collectionId?: string;
}
