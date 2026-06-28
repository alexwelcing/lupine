export interface Env {}

export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    // Serve the Library from the Cloud Run build (library-site) instead of the
    // stale Cloudflare Pages project. The Cloud Run image is rebuilt on every
    // push to main and already includes KaTeX-rendered math.
    const target = new URL(url.pathname + url.search, 'https://library-site-edbhtpvina-uc.a.run.app');
    const proxyReq = new Request(target, request);
    return fetch(proxyReq);
  },
};
