export interface AppSettings {
  collectionSortOrder: 'asc' | 'desc';
  workSortOrder: 'asc' | 'desc';
  showDateGrouping: boolean;
  downloadPath: string;
  showImageFilename: boolean;
  newCollectionPosition?: 'front' | 'back';
  favoritesSortOrder: 'newest' | 'oldest';
  allWorksCover?: string;
  allWorksCoverPosition?: number;
  allWorksCoverPositionVertical?: boolean;
}
