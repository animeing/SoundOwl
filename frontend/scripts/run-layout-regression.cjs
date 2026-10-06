#!/usr/bin/env node
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const DEFAULT_ARTIFACT_DIR = path.join('test-results', 'layout-regression-local');

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const env = buildEnvironment(options);
  const port = options.port || await findOpenPort(18080);
  env.FRONTEND_PORT = String(port);
  env.PORT = String(port);

  console.log(`[layout] frontend port: ${port}`);
  console.log('[layout] artifacts will be written to the selected artifact directory');
  logFilter('route', env.SOUNDOWL_LAYOUT_ROUTE_FILTER);
  logFilter('viewport', env.SOUNDOWL_LAYOUT_VIEWPORT_FILTER);
  logFilter('state', env.SOUNDOWL_LAYOUT_STATE_FILTER);

  if (options.installBrowser) {
    await runCommand(process.execPath, [playwrightCli(), 'install', 'chromium'], { env });
  }

  if (!options.skipBuild) {
    await runCommand(process.execPath, [require.resolve('webpack-cli/bin/cli.js'), '--config', 'webpack.config.js'], { env });
  }

  const playwrightArgs = [playwrightCli(), 'test', '--config', 'playwright.config.cjs'];
  if (!hasWorkersArg(options.playwrightArgs)) {
    playwrightArgs.push('--workers=1');
  }
  playwrightArgs.push(...options.playwrightArgs);

  let testExitCode = 0;
  try {
    await runCommand(process.execPath, playwrightArgs, { env });
  } catch (error) {
    testExitCode = error.exitCode || 1;
  }

  printSummaryLocations(env.SOUNDOWL_LAYOUT_ARTIFACT_DIR);
  process.exitCode = testExitCode;
}

function parseArgs(args) {
  const options = {
    artifactDir: DEFAULT_ARTIFACT_DIR,
    help: false,
    installBrowser: false,
    playwrightArgs: [],
    port: 0,
    route: '',
    skipBuild: false,
    state: '',
    viewport: '',
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--') {
      options.playwrightArgs.push(...args.slice(index + 1));
      break;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--skip-build') {
      options.skipBuild = true;
      continue;
    }
    if (arg === '--install-browser') {
      options.installBrowser = true;
      continue;
    }

    const [name, inlineValue] = splitOption(arg);
    if (!name) {
      options.playwrightArgs.push(arg);
      continue;
    }

    const value = inlineValue ?? args[index + 1];
    if (inlineValue === undefined) {
      index += 1;
    }
    if (value === undefined) {
      throw new Error(`Missing value for ${name}`);
    }

    if (name === '--route') {
      options.route = value;
    } else if (name === '--viewport') {
      options.viewport = value;
    } else if (name === '--state') {
      options.state = value;
    } else if (name === '--artifact-dir') {
      options.artifactDir = value;
    } else if (name === '--port') {
      options.port = Number(value);
      if (!Number.isInteger(options.port) || options.port <= 0) {
        throw new Error(`Invalid --port value: ${value}`);
      }
    } else {
      options.playwrightArgs.push(arg);
      if (inlineValue === undefined) {
        options.playwrightArgs.push(value);
      }
    }
  }

  return options;
}

function splitOption(arg) {
  if (!arg.startsWith('--')) {
    return ['', undefined];
  }
  const equalsIndex = arg.indexOf('=');
  if (equalsIndex === -1) {
    return [arg, undefined];
  }
  return [arg.slice(0, equalsIndex), arg.slice(equalsIndex + 1)];
}

function buildEnvironment(options) {
  const env = {
    ...process.env,
    SOUNDOWL_LAYOUT_ARTIFACT_DIR: options.artifactDir,
  };
  setOptionalEnv(env, 'SOUNDOWL_LAYOUT_ROUTE_FILTER', options.route);
  setOptionalEnv(env, 'SOUNDOWL_LAYOUT_VIEWPORT_FILTER', options.viewport);
  setOptionalEnv(env, 'SOUNDOWL_LAYOUT_STATE_FILTER', options.state);
  return env;
}

function setOptionalEnv(env, name, value) {
  if (value) {
    env[name] = value;
  } else {
    delete env[name];
  }
}

function runCommand(command, args, options) {
  console.log('[layout] running build or Playwright command');
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: FRONTEND_ROOT,
      env: options.env,
      shell: false,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      const error = new Error(signal ? `${command} stopped by signal ${signal}` : `${command} exited with ${code}`);
      error.exitCode = code || 1;
      reject(error);
    });
  });
}

function playwrightCli() {
  return path.join(FRONTEND_ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
}

function findOpenPort(startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = net.createServer();
      server.once('error', (error) => {
        if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
          tryPort(port + 1);
          return;
        }
        reject(error);
      });
      server.once('listening', () => {
        server.close(() => resolve(port));
      });
      server.listen(port, '127.0.0.1');
    };
    tryPort(startPort);
  });
}

function printSummaryLocations(artifactDir) {
  const resolvedArtifactDir = path.resolve(FRONTEND_ROOT, artifactDir);
  const summaries = findFiles(resolvedArtifactDir, 'summary.md');
  const jsonSummaries = findFiles(resolvedArtifactDir, 'summary.json');
  console.log(`[layout] generated ${summaries.length} Markdown and ${jsonSummaries.length} JSON summaries in the selected artifact directory`);
}

function findFiles(rootDir, fileName) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }
  const results = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.name === fileName) {
        results.push(fullPath);
      }
    }
  }
  return results.sort();
}

function hasWorkersArg(args) {
  return args.some((arg, index) => arg === '--workers' || arg.startsWith('--workers=') || (index > 0 && args[index - 1] === '--workers'));
}

function logFilter(label, value) {
  if (value) {
    console.log(`[layout] ${label} filter: enabled`);
  }
}

function printHelp() {
  console.log(`Run SoundOwl layout regression locally with the same Playwright checks used by CI.

Usage:
  npm run test:layout:local -- [options] [-- playwright args]

Options:
  --route <filter>         Only run routes whose name or path contains the filter.
  --viewport <filter>      Only run viewports whose name or size contains the filter.
  --state <filter>         Only run layout states whose name/action contains the filter.
  --artifact-dir <path>    Artifact output directory. Defaults to ${DEFAULT_ARTIFACT_DIR}.
  --port <number>          Frontend dev server port. Defaults to the first free port from 18080.
  --skip-build             Reuse the current build output.
  --install-browser        Run npx playwright install chromium before testing.
  --help                   Show this help.

Examples:
  npm run test:layout:quick
  npm run test:layout:local -- --route home --viewport 320x667
  npm run test:layout:local -- --state full-layout -- --debug
`);
}
