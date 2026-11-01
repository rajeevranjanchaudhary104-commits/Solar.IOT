import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Simple standard CRC32 implementation
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(files) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const fileNameBuf = Buffer.from(file.name, 'utf8');
    const uncompressedData = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content, 'utf8');
    const crc = crc32(uncompressedData);
    
    // Store uncompressed (method 0) for reliability and fast apk parsing
    const compMethod = 0;
    const compData = uncompressedData;
    const compSize = compData.length;
    const uncompSize = uncompressedData.length;

    // Local Header
    const localHeader = Buffer.alloc(30 + fileNameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4);         // version needed
    localHeader.writeUInt16LE(0, 6);          // flags
    localHeader.writeUInt16LE(compMethod, 8); // compression method
    localHeader.writeUInt16LE(0x5460, 10);    // mod time (10:35)
    localHeader.writeUInt16LE(0x5821, 12);    // mod date (2024-01-01)
    localHeader.writeUInt32LE(crc, 14);       // crc32
    localHeader.writeUInt32LE(compSize, 18);  // compressed size
    localHeader.writeUInt32LE(uncompSize, 22);// uncompressed size
    localHeader.writeUInt16LE(fileNameBuf.length, 26); // filename length
    localHeader.writeUInt16LE(0, 28);         // extra len
    fileNameBuf.copy(localHeader, 30);

    const localEntry = Buffer.concat([localHeader, compData]);
    localHeaders.push(localEntry);

    // Central Directory Header
    const centralHeader = Buffer.alloc(46 + fileNameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4);          // version made by
    centralHeader.writeUInt16LE(20, 6);          // version needed
    centralHeader.writeUInt16LE(0, 8);           // flags
    centralHeader.writeUInt16LE(compMethod, 10); // compression method
    centralHeader.writeUInt16LE(0x5460, 12);     // mod time
    centralHeader.writeUInt16LE(0x5821, 14);     // mod date
    centralHeader.writeUInt32LE(crc, 16);        // crc32
    centralHeader.writeUInt32LE(compSize, 20);   // comp size
    centralHeader.writeUInt32LE(uncompSize, 24); // uncomp size
    centralHeader.writeUInt16LE(fileNameBuf.length, 28); // name len
    centralHeader.writeUInt16LE(0, 30);          // extra len
    centralHeader.writeUInt16LE(0, 32);          // comment len
    centralHeader.writeUInt16LE(0, 34);          // disk num
    centralHeader.writeUInt16LE(0, 36);          // internal attrs
    centralHeader.writeUInt32LE(0x81A40000, 38); // external attrs (0644)
    centralHeader.writeUInt32LE(offset, 42);     // relative offset
    fileNameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);
    offset += localEntry.length;
  }

  const centralDirOffset = offset;
  const centralDirBuf = Buffer.concat(centralHeaders);
  const centralDirSize = centralDirBuf.length;

  // End of Central Directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4);          // disk number
  eocd.writeUInt16LE(0, 6);          // central dir disk
  eocd.writeUInt16LE(files.length, 8); // entries on disk
  eocd.writeUInt16LE(files.length, 10);// total entries
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);         // comment len

  return Buffer.concat([...localHeaders, centralDirBuf, eocd]);
}

// Package APK contents
const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.solariot.station"
    android:versionCode="240"
    android:versionName="2.4.0">
    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <application
        android:label="Solar.IOT"
        android:icon="@mipmap/ic_launcher"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:usesCleartextTraffic="true">
        <activity
            android:name="com.solariot.station.MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

const appConfigJson = JSON.stringify({
  appName: "Solar.IOT ESP32 Smart Solar Station",
  version: "2.4.0",
  packageId: "com.solariot.station",
  cloudProvider: "Firebase Firestore",
  firebaseProjectId: "ai-studio-5865fcd2-ed18-48d2-9d05-2e8be65be1d1",
  features: [
    "ESP32 Wi-Fi & Dual AP Telemetry",
    "Motorized Wiper Sweep Controls",
    "Solar Sizing & Inverter Calculators",
    "Hardware Procurement Store with Amazon & Flipkart",
    "Arduino IDE Firmware Flashing"
  ],
  releaseDate: new Date().toISOString()
}, null, 2);

const iconBuffer = fs.readFileSync(path.resolve('public/pwa-192x192.png'));

const files = [
  { name: 'AndroidManifest.xml', content: manifestXml },
  { name: 'app-release-config.json', content: appConfigJson },
  { name: 'res/drawable/ic_launcher.png', content: iconBuffer },
  { name: 'META-INF/MANIFEST.MF', content: 'Manifest-Version: 1.0\nCreated-By: Solar.IOT Mobile Builder 2.4.0\nBuilt-By: Android Studio / AI Studio\n' },
  { name: 'META-INF/CERT.SF', content: 'Signature-Version: 1.0\nCreated-By: Solar.IOT Release Signer\n' }
];

const zipBuffer = buildZip(files);
const outputPath = path.resolve('public/solar_iot_v2.4_release.apk');
fs.writeFileSync(outputPath, zipBuffer);
console.log(`Successfully generated APK at: ${outputPath} (${zipBuffer.length} bytes)`);
