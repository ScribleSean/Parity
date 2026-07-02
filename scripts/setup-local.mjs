#!/usr/bin/env node
/**
 * Local setup without Docker:
 * - Uses Docker Compose if `docker` is available
 * - Otherwise installs/starts Postgres via Homebrew and creates the `parity` DB
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, 'services/api/.env');

function run(cmd, opts = {}) {
  console.log(`→ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts });
}

function hasCommand(name) {
  return spawnSync('which', [name], { stdio: 'ignore' }).status === 0;
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function updateEnv(databaseUrl) {
  let content = existsSync(envPath)
    ? readFileSync(envPath, 'utf8')
    : readFileSync(path.join(root, 'services/api/.env.example'), 'utf8');

  if (/^DATABASE_URL=.*/m.test(content)) {
    content = content.replace(/^DATABASE_URL=.*/m, `DATABASE_URL="${databaseUrl}"`);
  } else {
    content = `DATABASE_URL="${databaseUrl}"\n${content}`;
  }

  writeFileSync(envPath, content);
  console.log(`Updated ${envPath}`);
}

function installGitHooks() {
  run('git config core.hooksPath scripts/git-hooks');
}

async function main() {
  console.log('\nParity local setup\n');

  if (await portOpen(5432)) {
    console.log('✓ Postgres already listening on :5432');
  } else if (hasCommand('docker')) {
    console.log('Starting Postgres + Redis via Docker...');
    run('docker compose -f infra/docker-compose.yml up -d');
    await new Promise((r) => setTimeout(r, 3000));
  } else if (hasCommand('brew')) {
    console.log('Docker not found — using Homebrew Postgres');
    if (!hasCommand('psql')) {
      console.log('Installing postgresql@16 (may take a minute)...');
      run('brew install postgresql@16');
    }
    run('brew services start postgresql@16');
    await new Promise((r) => setTimeout(r, 2000));

    const psql = hasCommand('psql')
      ? 'psql'
      : '/opt/homebrew/opt/postgresql@16/bin/psql';
    const createdb = hasCommand('createdb')
      ? 'createdb'
      : '/opt/homebrew/opt/postgresql@16/bin/createdb';

    try {
      run(`${createdb} parity 2>/dev/null || true`, { shell: true });
    } catch {
      // DB may already exist
    }

    const user = process.env.USER || 'postgres';
    updateEnv(`postgresql://${user}@localhost:5432/parity?schema=public`);
  } else {
    console.error(`
Could not start Postgres automatically.

Options:
  1. Install Docker Desktop: https://docs.docker.com/desktop/setup/install/mac-install/
     Then run: docker compose -f infra/docker-compose.yml up -d

  2. Install Homebrew + Postgres:
     /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
     brew install postgresql@16 && brew services start postgresql@16
     createdb parity

  3. Use a free cloud Postgres (Neon/Supabase), set DATABASE_URL in services/api/.env
`);
    process.exit(1);
  }

  if (!(await portOpen(5432))) {
    console.error('Postgres still not reachable on :5432. Check install and retry.');
    process.exit(1);
  }

  run('npm run db:generate');
  run('npm run db:push -w @parity/api');
  run('npm run db:seed');

  installGitHooks();

  console.log(`
✓ Setup complete

  npm run dev        # start API (:4000) + web (:3000)
  npm run dev:apps   # fallback if turbo fails

  Dev admin login: http://localhost:3000/login → "Dev admin login"
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
