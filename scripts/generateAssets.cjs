const fs = require('fs');
const path = require('path');

const brandingDir = path.join(__dirname, '../public/assets/branding');
const outputJson = path.join(__dirname, '../src/assetsData.json');

const data = {};

function formatTitle(dirName) {
  if (dirName.toLowerCase() === 'location_shot' || dirName.toLowerCase().trim() === 'location') return 'Merch Location Shots';
  if (dirName.toLowerCase() === 'ads') return 'Ads';
  if (dirName.toLowerCase() === 'canvas_ads') return 'Canvas Ads';
  if (dirName.toLowerCase() === 'canvas_in_the_wild_products') return 'Canvas In The Wild Products';
  if (dirName.toLowerCase() === 'canvas_products_shots') return 'Canvas Products Shots';
  if (dirName.toLowerCase() === 'merch') return 'Merch Studio Shots';
  if (dirName.toLowerCase() === 'personas') return 'On Location Personas Shots';
  // Fallback
  return dirName.charAt(0).toUpperCase() + dirName.slice(1);
}

const items = fs.readdirSync(brandingDir, { withFileTypes: true });

for (const item of items) {
  if (item.isDirectory() && item.name !== 'loading') {
    const dirPath = path.join(brandingDir, item.name);
    const files = fs.readdirSync(dirPath).filter(f => f.match(/\.(webp|png|jpg)$/i));
    
    if (files.length > 0) {
      const category = formatTitle(item.name);
      data[category] = files.map(f => `${item.name}/${f}`);
    }
  }
}

// Also read videos
const videosDir = path.join(__dirname, '../public/assets/videos');
if (fs.existsSync(videosDir)) {
  const videoFiles = fs.readdirSync(videosDir).filter(f => f.match(/\.(mp4|webm|mov)$/i));
  if (videoFiles.length > 0) {
    data['Campaign Videos'] = videoFiles;
  }
}

fs.writeFileSync(outputJson, JSON.stringify(data, null, 2));
console.log('src/assetsData.json successfully generated with categories:', Object.keys(data));

// Also scan audio tracks
const audioDir = path.join(__dirname, '../public/assets/audio');
const audioOutputJson = path.join(__dirname, '../src/audioData.json');

function formatAudioTitle(fileName) {
  return fileName
    .replace(/\.(mp3|ogg|wav|flac|aac|m4a)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bEven More\b/g, 'Even more')
    .replace(/\s+By\s+/g, ' by ');
}

if (fs.existsSync(audioDir)) {
  const audioFiles = fs.readdirSync(audioDir).filter(f => f.match(/\.(mp3|ogg|wav|flac|aac|m4a)$/i));
  const tracks = audioFiles.map(f => ({
    filename: f,
    title: formatAudioTitle(f),
    src: `/assets/audio/${f}`
  }));
  fs.writeFileSync(audioOutputJson, JSON.stringify(tracks, null, 2));
  console.log(`src/audioData.json generated with ${tracks.length} track(s):`, audioFiles);
} else {
  fs.writeFileSync(audioOutputJson, JSON.stringify([], null, 2));
  console.log('src/audioData.json generated (no audio directory found, empty playlist).');
}
