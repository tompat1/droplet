const DEFAULT_MAX_IMAGE_BYTES = 720000;

export function mediaFilename(title = 'droplet-media', extension = 'webp') {
  const safeTitle = String(title || 'droplet-media')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'droplet-media';
  return `${safeTitle}.${extension}`;
}

export function downloadMediaSource(source, filename) {
  if (!source) return;
  const anchor = document.createElement('a');
  anchor.href = source;
  anchor.download = filename || mediaFilename();
  anchor.rel = 'noopener';
  anchor.target = '_blank';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function readImageFileAsDataUrl(file, options = {}) {
  const maxDimension = options.maxDimension || 1400;
  const maxBytes = options.maxBytes || DEFAULT_MAX_IMAGE_BYTES;

  if (!file?.type?.startsWith('image/')) {
    return Promise.reject(new Error('Choose an image file.'));
  }

  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return readRawImageFile(file, maxBytes);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Could not load that image.'));
      image.onload = () => {
        const sourceWidth = image.naturalWidth || image.width;
        const sourceHeight = image.naturalHeight || image.height;
        let scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
        let best = '';

        for (let attempt = 0; attempt < 8; attempt += 1) {
          const width = Math.max(160, Math.round(sourceWidth * scale));
          const height = Math.max(160, Math.round(sourceHeight * scale));
          const quality = Math.max(0.48, 0.86 - attempt * 0.07);
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = width;
          canvas.height = height;
          context.drawImage(image, 0, 0, width, height);
          best = canvas.toDataURL('image/webp', quality);
          if (estimatedDataUrlBytes(best) <= maxBytes) {
            resolve(best);
            return;
          }
          scale *= 0.82;
        }

        if (estimatedDataUrlBytes(best) <= maxBytes * 1.25) {
          resolve(best);
          return;
        }

        reject(new Error('That image is too large for canvas storage. Try a smaller export.'));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function readRawImageFile(file, maxBytes) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (estimatedDataUrlBytes(dataUrl) > maxBytes) {
        reject(new Error('That image is too large for canvas storage. Try a smaller export.'));
        return;
      }
      resolve(dataUrl);
    };
    reader.readAsDataURL(file);
  });
}

function estimatedDataUrlBytes(dataUrl) {
  return Math.ceil(String(dataUrl || '').length * 0.75);
}
