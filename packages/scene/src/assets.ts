/**
 * Asset registry + loader.
 *
 * Scenes ask for assets by stable id (`last-train.clock`). The registry
 * resolves an id to what can be drawn right now:
 *   final art (if the asset is final and loaded)
 *   → the asset's fallback id (recursively)
 *   → the asset's own procedural placeholder.
 * Swapping a placeholder for production art is a manifest change only
 * (status: 'final', source, format); no scene, camera or game code changes.
 */
import type {AssetDefinition, AssetManifest, LayerId, PlaceholderShape} from '@roomriddle/shared-types';

export type ResolvedAsset =
  | {kind: 'image'; asset: AssetDefinition; uri: string; overlay: PlaceholderShape[]}
  | {kind: 'placeholder'; asset: AssetDefinition; shapes: PlaceholderShape[]}
  | {kind: 'missing'; id: string};

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed';

/** Loads one final file (e.g. Image.prefetch on the TV). Rejects on failure. */
export type AssetFetcher = (uri: string, asset: AssetDefinition) => Promise<void>;

export const LAYER_ORDER: readonly LayerId[] = ['far', 'background', 'midground', 'interactive', 'character', 'foreground', 'effects'];

export class AssetRegistry {
  private readonly byId = new Map<string, AssetDefinition>();
  private readonly basePaths = new Map<string, string>();

  constructor(manifests: readonly AssetManifest[] = []) {
    for (const m of manifests) {
      this.register(m);
    }
  }

  register(manifest: AssetManifest): void {
    for (const a of manifest.assets) {
      this.byId.set(a.id, a);
      this.basePaths.set(a.id, manifest.basePath);
    }
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  get(id: string): AssetDefinition | undefined {
    return this.byId.get(id);
  }

  ids(): string[] {
    return [...this.byId.keys()];
  }

  /** Where the final file lives, if the asset has one. */
  uriOf(id: string): string | null {
    const a = this.byId.get(id);
    if (!a || a.status !== 'final' || !a.source) {
      return null;
    }
    const base = this.basePaths.get(id) ?? '';
    return base ? `${base.replace(/\/$/, '')}/${a.source}` : a.source;
  }

  /**
   * What to draw for `id`. `isLoaded` says whether final art is available
   * (the loader's cache). Never throws: the worst case is `missing`.
   */
  resolve(id: string, isLoaded: (id: string) => boolean = () => true): ResolvedAsset {
    const seen = new Set<string>();
    let current: string | undefined = id;
    while (current !== undefined && !seen.has(current)) {
      seen.add(current);
      const asset = this.byId.get(current);
      if (!asset) {
        break;
      }
      const uri = this.uriOf(current);
      if (uri !== null && isLoaded(current)) {
        return {kind: 'image', asset, uri, overlay: asset.overlay ?? []};
      }
      if (asset.fallback === undefined && asset.placeholder) {
        return {kind: 'placeholder', asset, shapes: asset.placeholder};
      }
      current = asset.fallback;
    }
    // The fallback chain gave nothing drawable: use the first placeholder on it.
    for (const seenId of seen) {
      const asset = this.byId.get(seenId);
      if (asset?.placeholder) {
        return {kind: 'placeholder', asset, shapes: asset.placeholder};
      }
    }
    return {kind: 'missing', id};
  }
}

/**
 * Loads final art on demand with a reference-counted cache.
 * Placeholders are procedural, so they are "ready" immediately.
 * A failed file stays failed (the registry falls back) and is not retried
 * in a loop.
 */
export class AssetLoader {
  private readonly status = new Map<string, LoadStatus>();
  private readonly refs = new Map<string, number>();
  private readonly pending = new Map<string, Promise<void>>();

  constructor(
    private readonly registry: AssetRegistry,
    private readonly fetcher: AssetFetcher,
  ) {}

  statusOf(id: string): LoadStatus {
    return this.status.get(id) ?? 'idle';
  }

  /** True when final art for `id` can be drawn. */
  isLoaded = (id: string): boolean => this.status.get(id) === 'ready' && this.registry.uriOf(id) !== null;

  /** Everything the loader holds right now (for tests and diagnostics). */
  cached(): string[] {
    return [...this.refs.keys()];
  }

  /**
   * Acquire `ids` (and their fallbacks). Resolves once every final file has
   * loaded or failed; never rejects. `onProgress(done, total)` drives the
   * P5 loading UI.
   */
  async preload(ids: readonly string[], onProgress?: (done: number, total: number) => void): Promise<{failed: string[]}> {
    const wanted = this.withFallbacks(ids);
    for (const id of wanted) {
      this.refs.set(id, (this.refs.get(id) ?? 0) + 1);
    }
    const total = wanted.length;
    let done = 0;
    const failed: string[] = [];
    onProgress?.(0, total);
    await Promise.all(
      wanted.map(async id => {
        await this.load(id);
        if (this.status.get(id) === 'failed') {
          failed.push(id);
        }
        done += 1;
        onProgress?.(done, total);
      }),
    );
    return {failed};
  }

  /** Release `ids`; files nobody holds any more leave the cache. */
  unload(ids: readonly string[]): string[] {
    const evicted: string[] = [];
    for (const id of this.withFallbacks(ids)) {
      const n = (this.refs.get(id) ?? 0) - 1;
      if (n <= 0) {
        this.refs.delete(id);
        this.status.delete(id);
        evicted.push(id);
      } else {
        this.refs.set(id, n);
      }
    }
    return evicted;
  }

  private load(id: string): Promise<void> {
    const state = this.status.get(id);
    if (state === 'ready' || state === 'failed') {
      return Promise.resolve();
    }
    const inFlight = this.pending.get(id);
    if (inFlight) {
      return inFlight;
    }
    const asset = this.registry.get(id);
    const uri = this.registry.uriOf(id);
    if (!asset || uri === null) {
      // Placeholder (or unknown id): nothing to fetch.
      this.status.set(id, asset ? 'ready' : 'failed');
      return Promise.resolve();
    }
    this.status.set(id, 'loading');
    const p = this.fetcher(uri, asset)
      .then(
        () => void this.status.set(id, 'ready'),
        () => void this.status.set(id, 'failed'),
      )
      .finally(() => this.pending.delete(id));
    this.pending.set(id, p);
    return p;
  }

  private withFallbacks(ids: readonly string[]): string[] {
    const out = new Set<string>();
    for (const id of ids) {
      let cur: string | undefined = id;
      while (cur !== undefined && !out.has(cur)) {
        out.add(cur);
        cur = this.registry.get(cur)?.fallback;
      }
    }
    return [...out];
  }
}

/** Problems in a manifest: duplicate ids, broken fallbacks, final assets without files, placeholders that don't match their size. */
export function validateManifest(manifest: AssetManifest): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const prefix = manifest.idPrefix;
  for (const a of manifest.assets) {
    if (ids.has(a.id)) {
      errors.push(`duplicate asset id ${a.id}`);
    }
    ids.add(a.id);
    if (!a.id.startsWith(prefix)) {
      errors.push(`${a.id}: ids must start with "${prefix}"`);
    }
    if (a.depth < 0 || a.depth > 1.2) {
      errors.push(`${a.id}: depth ${a.depth} is outside 0–1.2`);
    }
    if (a.status === 'final' && (!a.source || a.format === 'procedural')) {
      errors.push(`${a.id}: final assets need a source file and a file format`);
    }
    if (a.status === 'placeholder' && !a.placeholder && a.fallback === undefined) {
      errors.push(`${a.id}: a placeholder asset needs placeholder shapes or a fallback`);
    }
    for (const [kind, shapes] of [['placeholder', a.placeholder], ['overlay', a.overlay]] as const) {
      for (const s of shapes ?? []) {
        if (s.x < -1 || s.y < -1 || s.x + s.w > a.size.width + 1 || s.y + s.h > a.size.height + 1) {
          errors.push(`${a.id}: ${kind} shape${s.role ? ` "${s.role}"` : ''} falls outside the ${a.size.width}×${a.size.height} asset box`);
        }
      }
    }
    if (a.overlay && a.status !== 'final') {
      errors.push(`${a.id}: an overlay only makes sense on final art`);
    }
  }
  for (const a of manifest.assets) {
    if (a.fallback !== undefined && !ids.has(a.fallback)) {
      errors.push(`${a.id}: fallback ${a.fallback} does not exist`);
    }
  }
  return errors;
}
