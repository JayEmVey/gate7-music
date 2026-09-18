import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const directory = resolve('extension');
const manifest = JSON.parse(readFileSync(resolve(directory, 'manifest.json'), 'utf8'));
const output = resolve(`build/gate7-playlist-sync-${manifest.version}.zip`);
mkdirSync(resolve('build'), { recursive: true });
rmSync(output, { force: true });
execFileSync('zip', ['-q', output, 'manifest.json', 'auth.js', 'catalog.js', 'background.js', 'dashboard.html', 'dashboard.css', 'dashboard.js'], { cwd: directory });
console.log(`Extension package: ${output}`);
console.log('For local installation: chrome://extensions → Developer mode → Load unpacked → extension/');
