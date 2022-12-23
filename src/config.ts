import type { AbortSignal, HeadersInit, RequestInit } from '@mastojs/ponyfills';
import { AbortController, Headers } from '@mastojs/ponyfills';
import { gt, gte, lt, SemVer } from 'semver';

import type { LogType } from './logger';
import { LogLevel } from './logger';
import type { Serializer } from './serializers';
import { mergeAbortSignals, mergeHeadersInit } from './utils';

const DEFAULT_TIMEOUT_MS = 1000 * 300;

type VersionCompat = 'unimplemented' | 'removed' | 'compatible';
type SatisfiesVersionRangeResult = {
  compat: VersionCompat;
  version?: string;
};

export type MastoConfigProps = {
  readonly url: string;
  readonly streamingApiUrl: string;
  readonly logLevel?: LogType;
  readonly version?: SemVer;
  readonly accessToken?: string;
  readonly timeout?: number;
  readonly defaultRequestInit?: Omit<RequestInit, 'body' | 'method'>;
  readonly disableVersionCheck?: boolean;
  readonly disableDeprecatedWarning?: boolean;
};

export class MastoConfig {
  constructor(
    private readonly props: MastoConfigProps,
    private readonly serializer: Serializer,
  ) {}

  get timeout(): number {
    return this.props.timeout ?? DEFAULT_TIMEOUT_MS;
  }

  createHeader(override: HeadersInit = {}): Headers {
    const headersInit = mergeHeadersInit([
      this.props.defaultRequestInit?.headers ?? {},
      { 'Content-Type': 'application/json' },
      override,
    ]);
    const headers: HeadersInit = new Headers(headersInit);

    if (this.props.accessToken) {
      headers.set('Authorization', `Bearer ${this.props.accessToken}`);
    }

    return new Headers(headers);
  }

  createWebsocketProtocols(protocols = []): string[] {
    return this.supportsSecureToken() && this.props.accessToken != undefined
      ? [this.props.accessToken, ...protocols]
      : protocols;
  }

  resolveHttpPath(path: string, params: unknown = {}): URL {
    const url = new URL(this.props.url.replace(/\/$/, '') + path);
    url.search = this.serializer.serializeQueryString(params);
    return url;
  }

  resolveWebsocketPath(
    path: string,
    params: Record<string, unknown> = {},
  ): string {
    const url = new URL(this.props.streamingApiUrl.replace(/\/$/, '') + path);
    if (!this.supportsSecureToken()) {
      params.accessToken = this.props.accessToken;
    }

    url.search = this.serializer.serializeQueryString(params);
    return url.toString();
  }

  createAbortController(signal?: AbortSignal | null): AbortSignal {
    const timeoutController = new AbortController();

    const signals: AbortSignal[] = [timeoutController.signal];
    if (signal != undefined) {
      signals.push(signal);
    }
    if (this.props.defaultRequestInit?.signal) {
      // FIXME: `abort-controller` and `node-fetch` mismatches
      signals.push(this.props.defaultRequestInit.signal as AbortSignal);
    }

    setTimeout(() => {
      timeoutController.abort();
    }, this.timeout);

    return mergeAbortSignals(signals);
  }

  getLogLevel(): LogLevel {
    return LogLevel.from(this.props.logLevel ?? 'warn');
  }

  shouldWarnDeprecated(): boolean {
    return !this.props.disableDeprecatedWarning;
  }

  satisfiesVersion(
    since?: SemVer,
    until?: SemVer,
  ): SatisfiesVersionRangeResult {
    if (this.props.version == undefined || this.props.disableVersionCheck) {
      return {
        compat: 'compatible',
        version: this.props.version?.version,
      };
    }

    if (since && lt(this.props.version, since)) {
      return {
        compat: 'unimplemented',
        version: this.props.version?.version,
      };
    }

    if (until && gt(this.props.version, until)) {
      return {
        compat: 'removed',
        version: this.props.version?.version,
      };
    }

    return {
      compat: 'compatible',
      version: this.props.version?.version,
    };
  }

  private supportsSecureToken() {
    if (this.props.version == undefined || this.props.disableVersionCheck) {
      return true;
    }

    // Since v2.8.4, it is supported to pass access token with`Sec-Websocket-Protocol`
    // https://github.com/tootsuite/mastodon/pull/10818
    return (
      this.props.streamingApiUrl.startsWith('wss:') &&
      gte(this.props.version, new SemVer('2.8.4', { loose: true }))
    );
  }
}
