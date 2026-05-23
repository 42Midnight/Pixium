import { useState, useEffect, useCallback } from 'react';
import ContextMenu from '../common/ContextMenu';

interface ImageViewerProps {
  images: string[];
  title: string;
  folder?: string;
  coverUrl: string;
  downloadPath: string;
  showFilename?: boolean;
}

export default function ImageViewer({ images, title, folder, coverUrl, downloadPath, showFilename = true }: ImageViewerProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomedPath, setZoomedPath] = useState('');
  const [zoomedRawPath, setZoomedRawPath] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; imagePath: string; rawPath: string } | null>(null);

  // Lock body scroll when zoomed
  useEffect(() => {
    if (isZoomed) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isZoomed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsZoomed(false); setContextMenu(null); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { protocolPrefix, baseDir } = (() => {
    let prefix = '';
    let rest = coverUrl;
    for (const p of ['pixium:///', 'pixium://', 'file:///', 'file://']) {
      if (rest.startsWith(p)) { prefix = p; rest = rest.substring(p.length); break; }
    }
    const dir = rest.includes('/') ? rest.substring(0, rest.lastIndexOf('/')) : '';
    return { protocolPrefix: prefix, baseDir: dir };
  })();

  const buildImagePath = useCallback((imageName: string): string => {
    if (imageName.startsWith('pixium://') || imageName.startsWith('file://')) return imageName;
    if (imageName.includes('/')) return protocolPrefix + imageName;
    return protocolPrefix + (baseDir ? `${baseDir}/${imageName}` : imageName);
  }, [protocolPrefix, baseDir]);

  const stripProtocol = useCallback((path: string): string => {
    for (const p of ['pixium:///', 'pixium://', 'file:///', 'file://']) {
      if (path.startsWith(p)) return path.substring(p.length);
    }
    return path;
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, imagePath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, imagePath, rawPath: stripProtocol(imagePath) });
  }, [stripProtocol]);

  const handleSaveAs = useCallback(async () => {
    if (!contextMenu || !window.electronAPI) return;
    const path = contextMenu.rawPath;
    const result = await window.electronAPI.saveImageAs(decodeURIComponent(path));
    if (!result.success && result.error !== '用户取消保存') {
      alert('保存失败：' + result.error);
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleDownload = useCallback(async () => {
    if (!contextMenu) return;
    if (!downloadPath) { alert('请先在设置中配置下载位置'); setContextMenu(null); return; }
    if (!window.electronAPI) return;
    const path = contextMenu.rawPath;
    const fileName = contextMenu.imagePath.split('/').pop() || 'image.jpg';
    const result = await window.electronAPI.downloadSingleImage(decodeURIComponent(path), downloadPath, fileName);
    if (result.success) alert(`图片已下载到：${result.path}`);
    else alert('下载失败：' + result.error);
    setContextMenu(null);
  }, [contextMenu, downloadPath]);

  const handleCopyImage = useCallback(async () => {
    if (!contextMenu) return;
    try {
      const img = new Image();
      img.src = contextMenu.imagePath;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('load failed'));
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch {
      alert('复制图像失败');
    }
    setContextMenu(null);
  }, [contextMenu]);

  const contextMenuItems = [
    { label: '复制', onClick: handleCopyImage },
    { label: '下载', onClick: handleDownload },
    { label: '另存为', onClick: handleSaveAs },
  ];

  const renderImage = (imagePath: string, index?: number) => (
    <div key={index} className="detail-image-wrapper">
      <div className="image-container"
        onClick={() => { const path = buildImagePath(typeof imagePath === 'string' && imagePath.includes('/') ? imagePath : imagePath); setZoomedPath(path); setZoomedRawPath(stripProtocol(path)); setIsZoomed(true); }}
        onContextMenu={e => handleContextMenu(e, imagePath)}>
        <img src={imagePath} alt={title} className="detail-image"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      </div>
      {showFilename && <p className="image-filename">{imagePath.split('/').pop()}</p>}
    </div>
  );

  return (
    <>
      {images.length > 1 ? (
        <div className="multiple-images-container">
          {images.map((name, i) => renderImage(buildImagePath(name), i))}
        </div>
      ) : (
        renderImage(coverUrl)
      )}

      {isZoomed && (
        <div className="image-zoom-overlay"
          onClick={() => { setIsZoomed(false); setContextMenu(null); }}
          onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, imagePath: zoomedPath, rawPath: decodeURIComponent(zoomedRawPath) }); }}>
          <div className="image-zoom-container">
            <img src={zoomedPath} alt={title} className="image-zoom-content" draggable={false} />
          </div>
          {contextMenu && (
            <div onClick={e => e.stopPropagation()} onContextMenu={e => e.stopPropagation()}>
              <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenuItems} onClose={() => setContextMenu(null)} />
            </div>
          )}
        </div>
      )}

      {contextMenu && !isZoomed && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenuItems} onClose={() => setContextMenu(null)} />
      )}
    </>
  );
}
