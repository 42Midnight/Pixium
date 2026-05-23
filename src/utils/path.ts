export function fileUrlToPath(url: string): string {
  let path = url;
  if (path.startsWith('file:///')) {
    path = path.substring(8);
  } else if (path.startsWith('file://')) {
    path = path.substring(7);
  }
  return decodeURIComponent(path);
}

export function getFolderPath(fileName: string): string {
  if (!fileName.includes('/')) return '';
  const parts = fileName.split('/');
  parts.pop();
  return parts.join('/');
}

export function getFileName(fileName: string): string {
  return fileName.split('/').pop() ?? fileName;
}

export function buildImagePath(folderPath: string, imageName: string): string {
  return `${folderPath}/${imageName}`;
}

export function isPixiumProtocol(url: string): boolean {
  return url.startsWith('pixium://');
}

export function isFileProtocol(url: string): boolean {
  return url.startsWith('file://');
}
