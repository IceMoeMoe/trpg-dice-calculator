const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const testDir = path.resolve(__dirname, '..', 'test');
const files = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.js'))
  // 优先运行更小/关键的测试，减少首次失败时的干扰
  .sort((a, b) => a.localeCompare(b));

for (const f of files) {
  const full = path.join(testDir, f);
  console.log('>>> Running', f);
  try {
    execSync(`node "${full}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Test failed: ${f}`);
    process.exit(1);
  }
}

console.log('All smoke tests passed.');
