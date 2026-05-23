export interface AppSettings {
  collectionSortOrder: 'asc' | 'desc';
  workSortOrder: 'asc' | 'desc';
  showDateGrouping: boolean;
  downloadPath: string;
  showImageFilename: boolean;
  newCollectionPosition?: 'front' | 'back';
  favoritesSortOrder: 'newest' | 'oldest';
}
