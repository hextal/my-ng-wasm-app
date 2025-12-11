const fs = require('fs');
const path = require('path');

const ffmpegDir = 'public/ffmpeg';

// Create directory if it doesn't exist
if (!fs.existsSync(ffmpegDir)) {
  fs.mkdirSync(ffmpegDir, { recursive: true });
}

// Copy FFmpeg core-mt files (multi-threaded) from @ffmpeg/core-mt
// Multi-threaded version requires: core.js, core.wasm, and core.worker.js
fs.copyFileSync(
  'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.js',
  path.join(ffmpegDir, 'ffmpeg-core.js')
);

fs.copyFileSync(
  'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.wasm',
  path.join(ffmpegDir, 'ffmpeg-core.wasm')
);

fs.copyFileSync(
  'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.worker.js',
  path.join(ffmpegDir, 'ffmpeg-core.worker.js')
);

console.log('✓ FFmpeg core-mt files copied to public/ffmpeg');
console.log('  - ffmpeg-core.js');
console.log('  - ffmpeg-core.wasm');
console.log('  - ffmpeg-core.worker.js (multi-threaded)');
