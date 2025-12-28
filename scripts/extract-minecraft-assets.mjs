import fs from 'node:fs';
import path from 'node:path';

function usageAndExit(code = 1) {
  console.log(`Usage:
  node scripts/extract-minecraft-assets.mjs [--mcDir <.minecraft>] [--version <indexName>] [--index <path>] [--out <public/assets>]

Examples (Windows):
  node scripts/extract-minecraft-assets.mjs --version 1.21.4
  node scripts/extract-minecraft-assets.mjs --index \"%APPDATA%\\\\.minecraft\\\\assets\\\\indexes\\\\1.21.4.json\"
  node scripts/extract-minecraft-assets.mjs --mcDir \"%APPDATA%\\\\.minecraft\" --version 1.21.4
`);
  process.exit(code);
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function defaultMinecraftDir() {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA;
    if (appData) return path.join(appData, '.minecraft');
  }
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) return null;
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'minecraft');
  return path.join(home, '.minecraft');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFromIndex(assetsDir, index, resourcePath, destPath) {
  const obj = index.objects?.[resourcePath];
  if (!obj?.hash) return false;
  const hash = obj.hash;
  const srcPath = path.join(assetsDir, 'objects', hash.slice(0, 2), hash);
  if (!fs.existsSync(srcPath)) return false;
  ensureDir(path.dirname(destPath));
  fs.copyFileSync(srcPath, destPath);
  return true;
}

const mcDirArg = getArg('--mcDir') ?? getArg('--minecraftDir');
const versionArg = getArg('--version');
const indexArg = getArg('--index');
const outArg = getArg('--out') ?? path.join('public', 'assets');
if (process.argv.includes('--help') || process.argv.includes('-h')) usageAndExit(0);

const mcDir = mcDirArg ?? defaultMinecraftDir();
if (!mcDir) {
  console.error('Could not determine .minecraft directory; please pass --mcDir');
  usageAndExit(2);
}

const assetsDir = path.join(mcDir, 'assets');
const indexesDir = path.join(assetsDir, 'indexes');

let indexFile = indexArg;
if (!indexFile) {
  if (!versionArg) {
    const files = fs
      .readdirSync(indexesDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ f, t: fs.statSync(path.join(indexesDir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    indexFile = files[0] ? path.join(indexesDir, files[0].f) : null;
  } else {
    indexFile = path.join(indexesDir, `${versionArg}.json`);
  }
}

if (!indexFile || !fs.existsSync(indexFile)) {
  console.error(`Minecraft assets index not found: ${indexFile ?? '(none)'}`);
  usageAndExit(2);
}

const index = readJson(indexFile);

const textureFiles = [
  'grass_block_top.png',
  'grass_block_side.png',
  'dirt.png',
  'stone.png',
  'sand.png',
  'oak_log.png',
  'oak_log_top.png',
  'oak_leaves.png',
  'oak_planks.png',
];

const soundGroups = ['grass', 'stone', 'sand', 'wood', 'gravel'];
const soundKinds = ['break', 'place', 'step'];
const soundFiles = [];
for (const group of soundGroups) {
  for (const kind of soundKinds) {
    for (let i = 1; i <= 4; i += 1) soundFiles.push(`minecraft/sounds/block/${group}/${kind}${i}.ogg`);
  }
}

const texturesOutDir = path.join(outArg, 'blocks');
const soundsOutDir = path.join(outArg, 'sounds');
ensureDir(texturesOutDir);
ensureDir(soundsOutDir);

const copied = { textures: [], sounds: [] };
const missing = { textures: [], sounds: [] };

for (const file of textureFiles) {
  const resourcePath = `minecraft/textures/block/${file}`;
  const destPath = path.join(texturesOutDir, file);
  const ok = copyFromIndex(assetsDir, index, resourcePath, destPath);
  (ok ? copied.textures : missing.textures).push(resourcePath);
}

for (const resourcePath of soundFiles) {
  const rel = resourcePath.replace(/^minecraft\/sounds\//, '');
  const destPath = path.join(soundsOutDir, rel);
  const ok = copyFromIndex(assetsDir, index, resourcePath, destPath);
  (ok ? copied.sounds : missing.sounds).push(resourcePath);
}

const manifestPath = path.join(outArg, 'minecraft-extracted.json');
fs.writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      extractedAt: new Date().toISOString(),
      mcDir,
      indexFile,
      copied,
      missing,
    },
    null,
    2,
  ),
);

console.log(`Done.
- Textures copied: ${copied.textures.length}/${textureFiles.length}
- Sounds copied:   ${copied.sounds.length}/${soundFiles.length}
- Manifest:        ${manifestPath}
`);

