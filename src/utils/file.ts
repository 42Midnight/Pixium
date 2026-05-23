export function fileToBuffer(file: File): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const buffer = Array.from(new Uint8Array(arrayBuffer));
      resolve(buffer);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function generateFileName(originalName: string): string {
  const extension = originalName.split('.').pop() ?? 'jpg';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${timestamp}_${randomStr}.${extension}`;
}

export function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_');
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

export function isImageFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return IMAGE_EXTENSIONS.includes(ext);
}
