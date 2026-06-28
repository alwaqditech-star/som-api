import { Express, Request, Response } from 'express';

interface ShareAuction {
  id: string;
  title: string;
  status: string;
  currentPrice: string | number;
  vehicle?: {
    images?: { url: string; isPrimary?: boolean }[];
    brand?: { nameAr?: string };
    model?: string;
    year?: number;
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pickImage(auction: ShareAuction): string | null {
  const images = auction.vehicle?.images ?? [];
  if (images.length === 0) return null;
  const primary = images.find((i) => i.isPrimary) ?? images[0];
  return primary?.url ?? null;
}

function formatPrice(value: string | number): string {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `${n.toLocaleString('ar-SA')} ر.س`;
}

function renderSharePage(auction: ShareAuction, shareUrl: string, appSchemeUrl: string): string {
  const title = escapeHtml(auction.title);
  const price = escapeHtml(formatPrice(auction.currentPrice));
  const live = auction.status === 'live';
  const image = pickImage(auction);
  const imageTag = image ? escapeHtml(image) : '';
  const description = live
    ? `مزاد مباشر — السعر الحالي ${price}`
    : `السعر الحالي ${price}`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title} — SOM</title>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="${escapeHtml(shareUrl)}"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${escapeHtml(description)}"/>
  ${image ? `<meta property="og:image" content="${imageTag}"/>` : ''}
  <meta name="twitter:card" content="summary_large_image"/>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif;
      background: linear-gradient(160deg, #0f172a, #1e3a5f);
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 20px;
      overflow: hidden;
      backdrop-filter: blur(8px);
    }
    .hero {
      height: 200px;
      background: #1e293b center/cover no-repeat;
      ${image ? `background-image: url('${imageTag}');` : ''}
    }
    .body { padding: 20px; }
    h1 { margin: 0 0 8px; font-size: 1.25rem; line-height: 1.4; }
    .price { color: #fbbf24; font-size: 1.5rem; font-weight: 800; margin: 8px 0 16px; }
    .live {
      display: inline-block;
      background: #ef4444;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .btn {
      display: block;
      width: 100%;
      text-align: center;
      background: #2563eb;
      color: #fff;
      text-decoration: none;
      padding: 14px 16px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 1rem;
      border: none;
      cursor: pointer;
    }
    .hint { margin-top: 12px; color: rgba(255,255,255,0.65); font-size: 13px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="hero"></div>
    <div class="body">
      ${live ? '<span class="live">🔴 مباشر الآن</span>' : ''}
      <h1>${title}</h1>
      <div class="price">${price}</div>
      <button class="btn" id="openApp">افتح المزاد في تطبيق SOM</button>
      <p class="hint">إذا لم يفتح التطبيق تلقائياً، اضغط الزر أعلاه</p>
    </div>
  </div>
  <script>
    const appUrl = ${JSON.stringify(appSchemeUrl)};
    const webUrl = ${JSON.stringify(shareUrl)};
    function openApp() {
      window.location.href = appUrl;
      setTimeout(function () {
        window.location.href = 'intent://auction/${escapeHtml(auction.id)}#Intent;scheme=som;package=com.example.som;S.browser_fallback_url=' + encodeURIComponent(webUrl) + ';end';
      }, 600);
    }
    document.getElementById('openApp').addEventListener('click', openApp);
    setTimeout(openApp, 400);
  </script>
</body>
</html>`;
}

export function registerShareRoutes(http: Express): void {
  http.get('/share/auction/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const host = req.get('host') ?? 'som-api.vercel.app';
    const proto = req.get('x-forwarded-proto') ?? 'https';
    const origin = `${proto}://${host}`;
    const shareUrl = `${origin}/share/auction/${id}`;
    const appSchemeUrl = `som://auction/${id}`;

    try {
      const apiRes = await fetch(`${origin}/api/v1/auctions/${id}`, {
        headers: { Accept: 'application/json' },
      });
      if (!apiRes.ok) {
        res.status(404).type('html').send('<html lang="ar" dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:40px"><h1>المزاد غير موجود</h1></body></html>');
        return;
      }
      const auction = (await apiRes.json()) as ShareAuction;
      res.type('html').send(renderSharePage(auction, shareUrl, appSchemeUrl));
    } catch {
      res.status(500).type('html').send('<html lang="ar" dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:40px"><h1>تعذّر تحميل المزاد</h1></body></html>');
    }
  });

  http.get('/.well-known/assetlinks.json', (_req: Request, res: Response) => {
    res.json([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.example.som',
          sha256_cert_fingerprints: [],
        },
      },
    ]);
  });
}
