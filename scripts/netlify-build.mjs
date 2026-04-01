import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

function run(command, args, options = {}) {
  const isWindows = process.platform === 'win32';
  const result = spawnSync(
    isWindows ? 'cmd.exe' : command,
    isWindows ? ['/d', '/s', '/c', [command, ...args].join(' ')] : args,
    {
    stdio: 'inherit',
    ...options,
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

const repoRoot = process.cwd();

console.log('[netlify] Building user app…');
run('npm', ['run', 'build']);

console.log('[netlify] Building admin app…');
run('npm', ['--workspace', 'contesthub-admin', 'run', 'build'], {
  env: {
    ...process.env,
    VITE_BASE: '/admin/',
  },
});

const adminDist = path.join(repoRoot, 'apps', 'admin', 'dist');
const mergedAdminDist = path.join(repoRoot, 'dist', 'admin');

console.log('[netlify] Merging admin build into dist/admin…');
await fs.rm(mergedAdminDist, { recursive: true, force: true });
await fs.mkdir(mergedAdminDist, { recursive: true });
await fs.cp(adminDist, mergedAdminDist, { recursive: true });

console.log('[netlify] Done.');
