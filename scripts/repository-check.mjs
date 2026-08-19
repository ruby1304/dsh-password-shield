import { execFileSync } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const lock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'))

function fail(message) {
  console.error(message)
  process.exitCode = 1
}

if (pkg.name !== 'dsh-password-shield' || pkg.version !== '0.3.0' || pkg.license !== 'MIT') fail('package identity is unexpected')
if (pkg.repository?.url !== 'git+https://github.com/ruby1304/dsh-password-shield.git') fail('repository URL must match the public source')
if (pkg.publishConfig?.access !== 'public' || pkg.publishConfig?.provenance !== true) fail('public provenance publishing is required')
if (pkg.engines?.node !== '>=22') fail('Node.js support floor must remain explicit')
if (Object.keys(pkg.dependencies ?? {}).length !== 0) fail('the browser/host runtime must remain dependency-free')
if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) fail('package-lock version does not match package.json')

const expectedFiles = [
  'index.js', 'client.js', 'cordis.patch.yml', 'COMPARISON.md', 'README.md', 'README.zh-CN.md',
  'CHANGELOG.md', 'SECURITY.md', 'CONTRIBUTING.md', 'THIRD_PARTY_NOTICES.md', 'LICENSE',
]
if (JSON.stringify(pkg.files) !== JSON.stringify(expectedFiles)) fail('package files allowlist changed without review')
for (const path of expectedFiles) {
  const info = await stat(resolve(root, path))
  if ((info.mode & 0o777) !== 0o644) fail(`${path} must be mode 0644 in the public package`)
}

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)
const textExtensions = new Set(['', '.cjs', '.js', '.json', '.md', '.mjs', '.yaml', '.yml'])
const forbidden = [
  ['/Users' + '/', 'absolute macOS user path'],
  ['qu' + 'dian', 'local username'],
  ['ruby' + '-team', 'production team identifier'],
  ['ruby' + '-m5', 'production device identifier'],
  ['m3' + '-worker', 'production device identifier'],
  ['818' + '.work', 'private gateway identifier'],
  [['BEGIN', 'PRIVATE', 'KEY'].join(' '), 'private key material'],
]

for (const path of tracked) {
  if (!textExtensions.has(extname(path))) continue
  const source = await readFile(resolve(root, path), 'utf8')
  for (const [needle, label] of forbidden) {
    if (source.includes(needle)) fail(`${path} contains ${label}`)
  }
}

const host = await readFile(resolve(root, 'index.js'), 'utf8')
for (const capability of ['node:fs', 'node:child_process', 'node:net', 'node:http', 'node:https', 'credentials', 'fetch(']) {
  if (host.includes(capability)) fail(`Host gained forbidden capability: ${capability}`)
}
const client = await readFile(resolve(root, 'client.js'), 'utf8')
for (const capability of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage', '.value']) {
  if (client.includes(capability)) fail(`Client gained forbidden data or network capability: ${capability}`)
}
if (!client.includes("loader.load({ id: ID")) fail('client bundle no longer registers through the DSH module loader')
if (!client.includes("url.protocol === 'chrome-extension:'") || !client.includes("url.hostname === EXTENSION_ID")) fail('extension-origin guard is missing')

const changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8')
if (!changelog.startsWith(`# Changelog\n\n## ${pkg.version} - 2026-08-20\n`)) fail('top changelog release must be dated and match package.json')
const readme = await readFile(resolve(root, 'README.md'), 'utf8')
if (!readme.includes(`dsh-password-shield@${pkg.version} --save-exact --ignore-scripts`)) fail('README exact install command is missing')

console.log(`Repository hygiene passed for ${tracked.length} tracked files.`)
