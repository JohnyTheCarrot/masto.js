/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { fetchV1Instance, login } from '../src';
import { TokenPoolImpl } from './pools';

export default async (): Promise<void> => {
  const url = 'http://localhost:3000';
  const instance = await fetchV1Instance({ url });
  const masto = await login({ url });

  const app = await masto.v1.apps.create({
    clientName: 'Masto.js',
    redirectUris: 'urn:ietf:wg:oauth:2.0:oob',
    scopes: 'read write follow push admin:read admin:write',
  });

  const container = process.env.MASTODON_CONTAINER ?? 'mastodon';
  // if (container == undefined) {
  //   throw new Error('MASTODON_CONTAINER is not defined');
  // }

  const tokenPool = new TokenPoolImpl(container, masto, app);

  const adminToken = await masto.oauth.createToken({
    grantType: 'password',
    clientId: app.clientId!,
    clientSecret: app.clientSecret!,
    username: 'admin@localhost:3000',
    password: 'mastodonadmin',
    scope: 'read write follow push admin:read admin:write',
  });

  globalThis.__misc__ = {
    url,
    instance,
    tokens: tokenPool,
    adminToken,
  };
};
