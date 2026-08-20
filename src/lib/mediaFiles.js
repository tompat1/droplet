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

  const isSvg = file?.type === 'image/svg+xml' || /\.svg$/i.test(file?.name || '');

  if (!file?.type?.startsWith('image/') && !isSvg) {
    return Promise.reject(new Error('Choose an image file.'));
  }

  if (isSvg) {
    return readSvgImageFileAsWebp(file, { maxDimension, maxBytes });
  }

  if (file.type === 'image/gif') {
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

export function compressImageDataUrl(dataUrl, options = {}) {
  const maxDimension = options.maxDimension || 1200;
  const maxBytes = options.maxBytes || DEFAULT_MAX_IMAGE_BYTES;
  const source = String(dataUrl || '');

  if (!source.startsWith('data:image/') || /^data:image\/(svg\+xml|gif)/i.test(source)) {
    return Promise.resolve(source);
  }

  if (estimatedDataUrlBytes(source) <= maxBytes) {
    return Promise.resolve(source);
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error('Could not optimize that image for saving.'));
    image.onload = () => {
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      let scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
      let best = source;

      for (let attempt = 0; attempt < 9; attempt += 1) {
        const width = Math.max(120, Math.round(sourceWidth * scale));
        const height = Math.max(120, Math.round(sourceHeight * scale));
        const quality = Math.max(0.42, 0.82 - attempt * 0.065);
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
        scale *= 0.78;
      }

      resolve(best);
    };
    image.src = source;
  });
}

export function isSvgImageSource(source) {
  const raw = String(source || '').trim();
  return /^data:image\/svg\+xml[;,]/i.test(raw) || /\.svg(?:[?#].*)?$/i.test(raw);
}

export async function convertSvgImageSourceToWebp(source, options = {}) {
  const svgText = await svgTextFromSource(source);
  return renderSvgTextAsWebp(svgText, options);
}

function readSvgImageFileAsWebp(file, options = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that SVG.'));
    reader.onload = () => {
      renderSvgTextAsWebp(String(reader.result || ''), options).then(resolve, reject);
    };
    reader.readAsText(file);
  });
}

function renderSvgTextAsWebp(svgText, options = {}) {
  const maxDimension = options.maxDimension || 1400;
  const maxBytes = options.maxBytes || DEFAULT_MAX_IMAGE_BYTES;

  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
    const objectUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not convert that SVG to WebP.'));
    };
    image.onload = () => {
      try {
        const dimensions = svgDimensions(svgText);
        const sourceWidth = image.naturalWidth || image.width || dimensions.width || maxDimension;
        const sourceHeight = image.naturalHeight || image.height || dimensions.height || maxDimension;
        let scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
        let best = '';

        for (let attempt = 0; attempt < 8; attempt += 1) {
          const width = Math.max(96, Math.round(sourceWidth * scale));
          const height = Math.max(96, Math.round(sourceHeight * scale));
          const quality = Math.max(0.5, 0.9 - attempt * 0.06);
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = width;
          canvas.height = height;
          context.clearRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
          best = canvas.toDataURL('image/webp', quality);
          if (estimatedDataUrlBytes(best) <= maxBytes) {
            URL.revokeObjectURL(objectUrl);
            resolve(best);
            return;
          }
          scale *= 0.82;
        }

        URL.revokeObjectURL(objectUrl);
        if (estimatedDataUrlBytes(best) <= maxBytes * 1.25) {
          resolve(best);
          return;
        }
        reject(new Error('That SVG is too large after WebP conversion. Try a simpler export.'));
      } catch {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not convert that SVG to WebP.'));
      }
    };

    image.src = objectUrl;
  });
}

async function svgTextFromSource(source) {
  const raw = String(source || '').trim();
  if (!raw) throw new Error('No SVG source provided.');

  if (/^data:image\/svg\+xml[,;]/i.test(raw)) {
    const commaIndex = raw.indexOf(',');
    const meta = commaIndex >= 0 ? raw.slice(0, commaIndex).toLowerCase() : '';
    const payload = commaIndex >= 0 ? raw.slice(commaIndex + 1) : '';
    if (meta.includes(';base64')) {
      const binary = window.atob(payload);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return decodeURIComponent(payload);
  }

  const response = await fetch(raw);
  if (!response.ok) throw new Error('Could not fetch that SVG.');
  return response.text();
}

function svgDimensions(svgText) {
  try {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    const width = parseSvgLength(svg?.getAttribute('width'));
    const height = parseSvgLength(svg?.getAttribute('height'));
    if (width && height) return { width, height };
    const viewBox = String(svg?.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if (viewBox.length === 4 && Number.isFinite(viewBox[2]) && Number.isFinite(viewBox[3])) {
      return { width: viewBox[2], height: viewBox[3] };
    }
  } catch {
    // Fall through to default dimensions.
  }
  return { width: 1024, height: 1024 };
}

function parseSvgLength(value) {
  const match = String(value || '').trim().match(/^([0-9.]+)/);
  const number = match ? Number(match[1]) : 0;
  return Number.isFinite(number) && number > 0 ? number : 0;
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
