const UPSTREAM = 'https://www.tikwm.com/api/user/posts';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}

async function getPage(handle, count, cursor) {
  const url = new URL(UPSTREAM);
  url.searchParams.set('unique_id', handle);
  url.searchParams.set('count', String(count));
  url.searchParams.set('cursor', String(cursor || 0));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json,text/plain,*/*',
        'accept-language': 'en-US,en;q=0.9',
        'referer': 'https://www.tikwm.com/',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36'
      },
      cache: 'no-store',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`TikWM returned HTTP ${response.status}`);
    const data = await response.json();
    if (!data || data.code !== 0 || !data.data) {
      throw new Error(data?.msg || 'TikWM did not return creator data');
    }
    return data.data;
  } finally {
    clearTimeout(timer);
  }
}

function normalize(v) {
  const views = Number(v.play_count) || 0;
  const likes = Number(v.digg_count) || 0;
  const comments = Number(v.comment_count) || 0;
  const shares = Number(v.share_count) || 0;
  const caption = String(v.title || '').trim();
  const author = v.author?.unique_id || '';
  const hashtags = [...caption.matchAll(/#([\p{L}\p{N}_.-]+)/gu)].map(m => m[1].toLowerCase());
  return {
    id: String(v.id || v.video_id || ''),
    caption,
    duration: Number(v.duration) || 0,
    views,
    likes,
    comments,
    shares,
    engagement: views ? (likes + comments + shares) / views : 0,
    createTime: Number(v.create_time) || 0,
    author,
    hashtags,
    url: (v.id || v.video_id) ? `https://www.tiktok.com/@${author || 'user'}/video/${v.id || v.video_id}` : ''
  };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.end();
  }
  if (req.method !== 'GET') return json(res, 405, { error: 'GET only' });

  const raw = String(req.query?.handle || '').trim().replace(/^@/, '');
  const handle = raw.split(/[/?#]/)[0];
  if (!/^[A-Za-z0-9._]{2,32}$/.test(handle)) {
    return json(res, 400, { error: 'Enter a valid TikTok username.' });
  }

  const requested = Math.min(100, Math.max(1, Number(req.query?.limit) || 100));
  const videos = [];
  const seen = new Set();
  let cursor = '0';

  try {
    for (let page = 0; page < 4 && videos.length < requested; page++) {
      const data = await getPage(handle, Math.min(35, requested - videos.length), cursor);
      for (const item of (data.videos || [])) {
        const v = normalize(item);
        if (v.id && !seen.has(v.id)) {
          seen.add(v.id);
          videos.push(v);
        }
      }
      if (!data.hasMore || !data.cursor) break;
      cursor = String(data.cursor);
      await new Promise(r => setTimeout(r, 250));
    }
    if (!videos.length) return json(res, 404, { error: 'No public videos were returned for that creator.' });
    return json(res, 200, { ok: true, handle, count: videos.length, videos });
  } catch (error) {
    console.error('TikTok creator fetch failed:', error);
    return json(res, 502, {
      error: 'The TikTok data provider could not be reached server-side.',
      detail: error?.message || 'Unknown upstream error'
    });
  }
};
