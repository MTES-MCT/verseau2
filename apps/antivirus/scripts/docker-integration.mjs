import { spawnSync } from 'node:child_process';

// No bind mounts: works with a sibling/DinD daemon as well as local Docker.
const image = 'verseau-antivirus-integration:local';
for (const args of [
  ['build', '-f', 'test/Dockerfile', '-t', image, '.'],
  ['run', '--rm', '--memory=4g', image],
]) {
  const result = spawnSync('docker', args, { stdio: 'inherit', cwd: new URL('../', import.meta.url), timeout: 600000 });
  if (result.error || result.status !== 0) {
    console.error('Real ClamAV integration failed (Docker/CDN availability required).');
    process.exit(result.status || 1);
  }
}
