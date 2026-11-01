import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height) {
  // RGBA buffer: width * 4 bytes per row + 1 filter byte per row
  const rowSize = width * 4;
  const rawData = Buffer.alloc((rowSize + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.45;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Base dark slate gradient background
      let r = 14 + Math.floor((y / height) * 10);
      let g = 23 + Math.floor((y / height) * 15);
      let b = 38 + Math.floor((y / height) * 20);
      let a = 255;

      // Outer squircle / rounded rect container
      const cornerR = width * 0.22;
      const qx = Math.max(0, Math.abs(x - cx) - (cx - cornerR));
      const qy = Math.max(0, Math.abs(y - cy) - (cy - cornerR));
      const qDist = Math.sqrt(qx * qx + qy * qy);
      if (qDist > cornerR) {
        a = 0; // Transparent outside rounded corner
      }

      // Sun glow in upper right: cx + width*0.2, cy - height*0.2
      const sunDx = x - (cx + width * 0.22);
      const sunDy = y - (cy - height * 0.22);
      const sunDist = Math.sqrt(sunDx * sunDx + sunDy * sunDy);
      if (sunDist < width * 0.13) {
        // Glowing sun
        r = 245;
        g = 158;
        b = 11;
      } else if (sunDist < width * 0.2) {
        const factor = (width * 0.2 - sunDist) / (width * 0.07);
        r = Math.min(255, Math.floor(r + (245 - r) * factor));
        g = Math.min(255, Math.floor(g + (158 - g) * factor));
        b = Math.min(255, Math.floor(b + (11 - b) * factor));
      }

      // Solar Panel trapezoid in lower half
      const panelTop = cy - height * 0.05;
      const panelBottom = cy + height * 0.32;
      if (y >= panelTop && y <= panelBottom) {
        const progress = (y - panelTop) / (panelBottom - panelTop);
        const halfWidth = (width * 0.25) + progress * (width * 0.16);
        if (Math.abs(x - cx) <= halfWidth) {
          // Solar panel cell blue
          r = 2;
          g = 132;
          b = 199;

          // Grid lines
          if (
            Math.abs(x - cx) < 2 ||
            Math.abs(Math.abs(x - cx) - halfWidth * 0.5) < 2 ||
            Math.abs(y - (panelTop + (panelBottom - panelTop) * 0.33)) < 2 ||
            Math.abs(y - (panelTop + (panelBottom - panelTop) * 0.66)) < 2
          ) {
            r = 125;
            g = 211;
            b = 252;
          }

          // Wiper blade line across panel
          const wiperX = cx + (y - cy) * 0.6;
          if (Math.abs(x - wiperX) < width * 0.02) {
            r = 16;
            g = 185;
            b = 129;
          }
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  // PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression: 0
  ihdrData[11] = 0; // Filter: 0
  ihdrData[12] = 0; // Interlace: 0
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT (Deflate)
  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

fs.writeFileSync('public/pwa-192x192.png', createPNG(192, 192));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512, 512));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPNG(512, 512));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180));
console.log('Successfully generated all PWA PNG icons!');
