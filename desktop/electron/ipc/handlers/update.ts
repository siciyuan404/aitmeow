import { app, ipcMain, shell } from 'electron';
import https from 'https';

const DEFAULT_REPOSITORY = 'siciyuan404/aitmeow';
const WINDOWS_PACKAGE_ASSET = 'AitMeow-win32-x64.zip';

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  updated_at?: string;
}

interface GitHubRelease {
  tag_name: string;
  name?: string;
  html_url: string;
  body?: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at?: string | null;
  assets: GitHubReleaseAsset[];
}

interface UpdateStatus {
  currentVersion: string;
  repository: string;
  releasesUrl: string;
  platform: NodeJS.Platform;
  arch: string;
  expectedAssetName: string;
}

interface UpdateCheckResult extends UpdateStatus {
  latestVersion: string | null;
  latestTag: string | null;
  updateAvailable: boolean;
  releaseName?: string;
  releaseUrl?: string;
  releaseNotes?: string | null;
  publishedAt?: string | null;
  assetName?: string;
  assetUrl?: string;
  assetSize?: number;
}

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
}

function updateRepository(): string {
  return process.env.AITMEOW_UPDATE_REPO || DEFAULT_REPOSITORY;
}

function releasesUrl(repository = updateRepository()): string {
  return `https://github.com/${repository}/releases`;
}

function latestReleaseApiUrl(repository = updateRepository()): string {
  return `https://api.github.com/repos/${repository}/releases/latest`;
}

function status(): UpdateStatus {
  const repository = updateRepository();
  return {
    currentVersion: app.getVersion(),
    repository,
    releasesUrl: releasesUrl(repository),
    platform: process.platform,
    arch: process.arch,
    expectedAssetName: WINDOWS_PACKAGE_ASSET,
  };
}

function requestJson<T>(url: string, redirects = 0): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': `aitmeow/${app.getVersion()}`,
        },
      },
      (res) => {
        const statusCode = res.statusCode ?? 0;
        const location = res.headers.location;

        if (statusCode >= 300 && statusCode < 400 && location) {
          res.resume();
          if (redirects >= 3) {
            reject(new Error('GitHub release request redirected too many times'));
            return;
          }
          requestJson<T>(location, redirects + 1).then(resolve, reject);
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          res.resume();
          reject(new Error(`GitHub release request failed with HTTP ${statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')) as T);
          } catch (err) {
            reject(err);
          }
        });
      },
    );

    req.setTimeout(15000, () => {
      req.destroy(new Error('GitHub release request timed out'));
    });
    req.on('error', reject);
  });
}

function parseVersion(version: string): ParsedVersion | null {
  const normalized = version.trim().replace(/^v/i, '');
  const [core, prerelease = null] = normalized.split('-', 2);
  const parts = core.split('.').map((part) => Number(part));

  if (parts.length < 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    return null;
  }

  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2],
    prerelease,
  };
}

function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);

  if (!left || !right) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  for (const key of ['major', 'minor', 'patch'] as const) {
    if (left[key] !== right[key]) return left[key] > right[key] ? 1 : -1;
  }

  if (left.prerelease === right.prerelease) return 0;
  if (!left.prerelease) return 1;
  if (!right.prerelease) return -1;
  return left.prerelease.localeCompare(right.prerelease, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function findWindowsPackage(release: GitHubRelease): GitHubReleaseAsset | undefined {
  return (
    release.assets.find((asset) => asset.name === WINDOWS_PACKAGE_ASSET)
    ?? release.assets.find((asset) => {
      const name = asset.name.toLowerCase();
      return name.endsWith('.zip') && name.includes('win32') && name.includes('x64');
    })
  );
}

async function checkForUpdates(): Promise<UpdateCheckResult> {
  const base = status();
  const release = await requestJson<GitHubRelease>(latestReleaseApiUrl(base.repository));
  const asset = findWindowsPackage(release);
  const latestVersion = release.tag_name.replace(/^v/i, '');

  return {
    ...base,
    latestVersion,
    latestTag: release.tag_name,
    updateAvailable: compareVersions(latestVersion, base.currentVersion) > 0,
    releaseName: release.name || release.tag_name,
    releaseUrl: release.html_url,
    releaseNotes: release.body ?? null,
    publishedAt: release.published_at ?? null,
    assetName: asset?.name,
    assetUrl: asset?.browser_download_url,
    assetSize: asset?.size,
  };
}

export function registerUpdateHandlers() {
  ipcMain.handle('update:getStatus', async () => status());

  ipcMain.handle('update:check', async () => checkForUpdates());

  ipcMain.handle('update:openRelease', async (_event, releaseUrl?: string) => {
    const target = releaseUrl || releasesUrl();
    await shell.openExternal(target);
    return { success: true, url: target };
  });

  ipcMain.handle('update:openDownload', async (_event, assetUrl?: string) => {
    let target = assetUrl;

    if (!target) {
      const result = await checkForUpdates();
      target = result.assetUrl || result.releaseUrl || result.releasesUrl;
    }

    await shell.openExternal(target);
    return { success: true, url: target };
  });
}
