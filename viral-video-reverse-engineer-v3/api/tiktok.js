const PROFILE_EMBED = 'https://www.tiktok.com/embed/@';
const VIDEO_EMBED = 'https://www.tiktok.com/embed/v2/';
const PLAYER_API = 'https://www.tiktok.com/player/api/v1/items';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(body));
}

class CookieJar {
  constructor(){ this.map = new Map(); }
  header(){ return [...this.map.entries()].map(([k,v])=>`${k}=${v}`).join('; '); }
  absorb(headers){
    let values = [];
    if (typeof headers?.getSetCookie === 'function') values = headers.getSetCookie();
    if (!values?.length) {
      const one = headers?.get?.('set-cookie');
      if (one) values = one.split(/,(?=\s*[A-Za-z0-9_!#$%&'*+.^`|~-]+=)/);
    }
    for (const raw of values || []) {
      const first = String(raw).split(';',1)[0];
      const idx = first.indexOf('=');
      if (idx <= 0) continue;
      const name = first.slice(0, idx).trim();
      const value = first.slice(idx + 1).trim();
      if (name && value) this.map.set(name, value);
    }
  }
}

function scriptJson(html, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<script\\b[^>]*\\bid\\s*=\\s*["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script\\s*>`, 'i');
  const match = String(html || '').match(re);
  if (!match) throw new Error(`${id} state was not found`);
  return JSON.parse(match[1].trim());
}

async function request(url, {referer, accept, jar, timeoutMs = 10000} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = {
      'user-agent': UA,
      'accept': accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache'
    };
    if (referer) headers.referer = referer;
    const cookie = jar?.header();
    if (cookie) headers.cookie = cookie;
    const response = await fetch(url, { headers, redirect:'follow', cache:'no-store', signal:controller.signal });
    jar?.absorb(response.headers);
    const text = await response.text();
    if (!response.ok) throw new Error(`TikTok HTTP ${response.status}`);
    return { text, response };
  } finally {
    clearTimeout(timer);
  }
}

function extractHashtags(text) {
  return [...String(text || '').matchAll(/#([\p{L}\p{N}_.-]+)/gu)].map(m => m[1].toLowerCase());
}

function findCreatorPage(state, handle) {
  const pages = Object.values(state?.source?.data || {});
  for (const page of pages) {
    if (page?.isError || String(page?.playlistType || '').toLowerCase() !== 'creator') continue;
    const unique = String(page?.userInfo?.uniqueId || '').toLowerCase();
    const playlist = String(page?.playlistId || '').toLowerCase();
    if (unique === handle.toLowerCase() || playlist === handle.toLowerCase()) return page;
  }
  throw new Error('TikTok creator embed did not contain this user');
}

async function fetchCreatorListing(handle, jar) {
  const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
  try { await request(profileUrl, { referer:'https://www.tiktok.com/', jar, timeoutMs:9000 }); } catch (e) { console.warn('profile warmup failed', e.message); }

  const { text: html } = await request(PROFILE_EMBED + encodeURIComponent(handle), { referer:profileUrl, jar, timeoutMs:12000 });
  const state = scriptJson(html, '__FRONTITY_CONNECT_STATE__');
  const page = findCreatorPage(state, handle);
  const videos = (page.videoList || [])
    .filter(v => v && v.id && !v.privateItem)
    .slice(0, 10)
    .map(v => ({
      id: String(v.id),
      caption: String(v.desc || ''),
      views: Number(v.playCount) || 0,
      duration: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      createTime: 0,
      author: String(v.authorUniqueId || page?.userInfo?.uniqueId || handle),
      hashtags: extractHashtags(v.desc || ''),
      url: `https://www.tiktok.com/@${encodeURIComponent(v.authorUniqueId || page?.userInfo?.uniqueId || handle)}/video/${encodeURIComponent(v.id)}`,
      partial: true
    }));
  return { page, videos };
}

function findVideoData(state, id) {
  for (const page of Object.values(state?.source?.data || {})) {
    const data = page?.videoData;
    if (String(data?.itemInfos?.id || '') !== String(id)) continue;
    if (page?.isError || (page?.code && page.code !== 200)) throw new Error(`TikTok video embed code ${page.code}`);
    return data;
  }
  throw new Error('TikTok video embed did not contain this post');
}

async function enrichFromEmbed(base, jar) {
  const { text: html } = await request(VIDEO_EMBED + encodeURIComponent(base.id), { referer:base.url, jar, timeoutMs:8000 });
  const state = scriptJson(html, '__FRONTITY_CONNECT_STATE__');
  const data = findVideoData(state, base.id);
  const item = data.itemInfos || {};
  const meta = item.video?.videoMeta || {};
  const author = data.authorInfos || {};
  const views = Number(item.playCount) || base.views || 0;
  const likes = Number(item.diggCount) || 0;
  const comments = Number(item.commentCount) || 0;
  const shares = Number(item.shareCount) || 0;
  const caption = String(item.text || base.caption || '');
  return { ...base, caption, views, likes, comments, shares, duration:Number(meta.duration)||0, createTime:Number(item.createTime)||0, author:String(author.uniqueId||base.author||''), hashtags:extractHashtags(caption), engagement:views?(likes+comments+shares)/views:0, partial:false, detailSource:'embed/v2' };
}

async function enrichFromPlayer(base, jar) {
  const u = new URL(PLAYER_API);
  u.searchParams.set('item_ids', base.id);
  u.searchParams.set('language', 'en');
  u.searchParams.set('aid', '1459');
  u.searchParams.set('data_source', 'web_core');
  const { text } = await request(u.toString(), { referer:base.url, accept:'application/json, text/plain, */*', jar, timeoutMs:8000 });
  let j; try { j = JSON.parse(text); } catch { throw new Error('TikTok player returned non-JSON'); }
  if (Number(j?.status_code) !== 0 || !Array.isArray(j?.items) || !j.items.length) throw new Error(j?.status_msg || 'TikTok player returned no post');
  const item = j.items[0];
  const stats = item.statistics_info || {};
  const meta = item.video_info?.meta || {};
  const caption = String(item.desc || base.caption || '');
  const views = Number(base.views) || 0;
  const likes = Number(stats.digg_count) || 0;
  const comments = Number(stats.comment_count) || 0;
  const shares = Number(stats.share_count) || 0;
  return { ...base, caption, likes, comments, shares, duration:Number(meta.duration)||0, author:String(item.author_info?.unique_id||base.author||''), hashtags:extractHashtags(caption), engagement:views?(likes+comments+shares)/views:0, partial:false, detailSource:'player/api/v1/items' };
}

async function enrichVideo(base, jar) {
  try { return await enrichFromEmbed(base, jar); }
  catch (embedError) {
    try { return await enrichFromPlayer(base, jar); }
    catch (playerError) { throw new Error(`embed: ${embedError.message}; player: ${playerError.message}`); }
  }
}

async function enrichInBatches(videos, jar, batchSize = 5) {
  const output = [];
  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(v => enrichVideo(v, jar)));
    results.forEach((result, idx) => {
      const base = batch[idx];
      if (result.status === 'fulfilled') output.push(result.value);
      else output.push({ ...base, engagement:0, enrichError:result.reason?.message || 'detail fetch failed' });
    });
  }
  return output;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error:'GET only' });
  const handle = String(req.query?.handle || '').trim().replace(/^@/, '').split(/[/?#]/)[0];
  if (!/^[A-Za-z0-9._]{2,32}$/.test(handle)) return send(res, 400, { error:'Invalid TikTok username' });

  const jar = new CookieJar();
  try {
    const listing = await fetchCreatorListing(handle, jar);
    if (!listing.videos.length) return send(res, 404, { error:'No public videos were exposed by TikTok for this creator.' });
    const videos = await enrichInBatches(listing.videos, jar);
    const detailed = videos.filter(v => !v.partial).length;
    return send(res, 200, { ok:true, handle, source:'TikTok public creator/video embeds', sampleType:'latest_public_embed', count:videos.length, detailedCount:detailed, videos });
  } catch (error) {
    console.error('TikTok embed fetch failed:', error);
    return send(res, 502, { error:'TikTok public embed fetch failed', detail:error?.message || 'Unknown TikTok error' });
  }
};
