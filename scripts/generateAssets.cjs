const fs = require('fs');
const path = require('path');

const brandingDir = path.join(__dirname, '../public/assets/branding');
const outputJson = path.join(__dirname, '../src/assetsData.json');

const data = {};

function formatTitle(dirName) {
  if (dirName.toLowerCase() === 'location_shot' || dirName.toLowerCase().trim() === 'location') return 'Merch Location Shots';
  if (dirName.toLowerCase() === 'ads') return 'Ads';
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
