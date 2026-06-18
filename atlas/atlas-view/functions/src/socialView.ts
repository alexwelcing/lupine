import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import {
  buildMissingViewShareModel,
  buildSavedViewShareModel,
  renderSavedViewShareHtml,
  savedViewSlugFromRequestPath,
  type SavedViewShareDoc,
  type SavedViewShareModel,
} from './socialMeta';

const VIEW_COLLECTION = 'lupiViews';
const PUBLIC_ORIGIN = process.env.LUPI_PUBLIC_ORIGIN || 'https://lupi.live';

interface HtmlResponse {
  status(code: number): HtmlResponse;
  set(field: string, value: string): HtmlResponse;
  send(body: string): void;
}

export const lupiViewShare = onRequest({ maxInstances: 20 }, async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.set('Allow', 'GET, HEAD');
    res.status(405).send('Method not allowed');
    return;
  }

  const querySlug = typeof req.query.slug === 'string' ? req.query.slug : '';
  const slug = savedViewSlugFromRequestPath(req.path)
    ?? savedViewSlugFromRequestPath(req.originalUrl ?? '')
    ?? (querySlug ? savedViewSlugFromRequestPath(`/view/${querySlug}`) : null);
  if (!slug) {
    sendShareHtml(res, 404, buildMissingViewShareModel('saved-view', PUBLIC_ORIGIN), false);
    return;
  }

  try {
    const snap = await getFirestore().collection(VIEW_COLLECTION).doc(slug).get();
    const data = snap.data() as SavedViewShareDoc | undefined;

    if (!snap.exists || data?.visibility !== 'public') {
      sendShareHtml(res, 404, buildMissingViewShareModel(slug, PUBLIC_ORIGIN), false);
      return;
    }

    const model = buildSavedViewShareModel(slug, data, PUBLIC_ORIGIN);
    res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
    sendShareHtml(res, 200, model, true);
  } catch (err) {
    logger.error('lupi_view_share_failed', { slug, error: String(err) });
    sendShareHtml(res, 500, buildMissingViewShareModel(slug, PUBLIC_ORIGIN), false);
  }
});

function sendShareHtml(
  res: HtmlResponse,
  status: number,
  model: SavedViewShareModel,
  redirectToApp: boolean,
) {
  res
    .status(status)
    .set('Content-Type', 'text/html; charset=utf-8')
    .set('X-Robots-Tag', model.robots);
  if (status !== 200) res.set('Cache-Control', 'no-cache');
  res.send(renderSavedViewShareHtml(model, redirectToApp));
}
