// Test script to check if filters produce different results
import { readFileSync, writeFileSync } from 'fs';
import { createCanvas, loadImage } from 'canvas';

// We'll test by comparing the resulting image data from each filter
async function testFilters() {
  console.log('Testing filters: lix, monochrome_tint, neue');
  
  // Create a simple test image with RGB gradient
  const canvas = createCanvas(50, 50);
  const ctx = canvas.getContext('2d');
  
  // Draw gradient
  const gradient = ctx.createLinearGradient(0, 0, 50, 50);
  gradient.addColorStop(0, 'rgb(255, 0, 0)');     // Red
  gradient.addColorStop(0.5, 'rgb(0, 255, 0)');   // Green
  gradient.addColorStop(1, 'rgb(0, 0, 255)');     // Blue
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 50, 50);
  
  // Get the ImageData
  const imageData = ctx.getImageData(0, 0, 50, 50);
  
  // Since we can't easily test Photon WASM filters here, 
  // let's output the test image and manually check in the browser
  const buffer = canvas.toBuffer('image/png');
  writeFileSync('filter-test-source.png', buffer);
  
  console.log('✓ Test image created: filter-test-source.png');
  console.log('Please load this image in the app and test these filters:');
  console.log('  - lix');
  console.log('  - monochrome_tint');
  console.log('  - neue');
  console.log('');
  console.log('If all three produce the same visual result, they should be removed.');
}

testFilters().catch(console.error);
