const prisma = require('../config/db');

let cache = null;
let cachedAt = 0;
const TTL_MS = 60_000;

async function loadSettings() {
  if (cache && Date.now() - cachedAt < TTL_MS) return cache;
  const rows = await prisma.systemSetting.findMany();
  cache = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  cachedAt = Date.now();
  return cache;
}

async function getSetting(key, envFallback = undefined) {
  const settings = await loadSettings();
  if (settings[key] !== undefined && settings[key] !== null && settings[key] !== '') return settings[key];
  return envFallback !== undefined ? envFallback : process.env[key];
}

async function setSetting(key, value) {
  await prisma.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  cache = null;
}

module.exports = { getSetting, setSetting, loadSettings };
