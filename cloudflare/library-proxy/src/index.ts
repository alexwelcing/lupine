export interface Env {}

export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, 'https://lupine-ledger.pages.dev');
    const proxyReq = new Request(target, request);
    return fetch(proxyReq);
  },
};
