const fs = require('node:fs');
const path = require('node:path');

const outputDir = process.argv[2] || path.join(__dirname, 'music');
fs.mkdirSync(outputDir, { recursive: true });

function writeWav(filePath, frequency) {
  const sampleRate = 8000;
  const durationSeconds = 1;
  const samples = sampleRate * durationSeconds;
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < samples; index += 1) {
    const sample = Math.round(Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 12000);
    buffer.writeInt16LE(sample, 44 + index * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

for (let index = 1; index <= 8; index += 1) {
  writeWav(path.join(outputDir, `track-${String(index).padStart(2, '0')}.wav`), 220 + index * 20);
}

