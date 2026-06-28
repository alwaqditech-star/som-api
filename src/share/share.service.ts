import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';

interface ShareAuction {
  id: string;
  title: string;
  status: string;
  currentPrice: string | number;
  vehicle?: {
    images?: { url: string; isPrimary?: boolean }[];
  };
}

@Injectable()
export class ShareService {
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private pickImage(auction: ShareAuction): string | null {
    const images = auction.vehicle?.images ?? [];
    if (images.length === 0) return null;
    const primary = images.find((i) => i.isPrimary) ?? images[0];
    return primary?.url ?? null;
  }

  private formatPrice(value: string | number): string {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return `${n.toLocaleString('ar-SA')} ر.س`;
  }

  private renderHtml(auction: ShareAuction, shareUrl: string, appSchemeUrl: string): string {
    const title = this.escapeHtml(auction.title);
    const price = this.escapeHtml(this.formatPrice(auction.currentPrice));
    const live = auction.status === 'live';
    const image = this.pickImage(auction);
    const imageTag = image ? this.escapeHtml(image) : '';
    const description = live
      ? `مزاد مباشر — السعر الحالي ${price}`
      : `السعر الحالي ${price}`;
    const auctionId = this.escapeHtml(auction.id);

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title} — SOM</title>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="${this.escapeHtml(shareUrl)}"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${this.escapeHtml(description)}"/>
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
      <a class="btn" id="openApp" href="${this.escapeHtml(appSchemeUrl)}">افتح المزاد في تطبيق SOM</a>
      <p class="hint">جاري فتح التطبيق… إذا لم يفتح، اضغط الزر</p>
    </div>
  </div>
  <script>
    (function () {
      var appUrl = ${JSON.stringify(appSchemeUrl)};
      var webUrl = ${JSON.stringify(shareUrl)};
      var auctionId = ${JSON.stringify(auction.id)};
      function openApp() {
        window.location.href = appUrl;
        setTimeout(function () {
          window.location.href =
            'intent://auction/' + auctionId +
            '#Intent;scheme=som;package=com.example.som;S.browser_fallback_url=' +
            encodeURIComponent(webUrl) + ';end';
        }, 800);
      }
      document.getElementById('openApp').addEventListener('click', function (e) {
        e.preventDefault();
        openApp();
      });
      openApp();
    })();
  </script>
</body>
</html>`;
  }

  async sendAuctionPage(id: string, req: Request, res: Response): Promise<void> {
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
        res
          .status(404)
          .type('html')
          .send(
            '<html lang="ar" dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:40px"><h1>المزاد غير موجود</h1></body></html>',
          );
        return;
      }
      const auction = (await apiRes.json()) as ShareAuction;
      res.type('html').send(this.renderHtml(auction, shareUrl, appSchemeUrl));
    } catch {
      res
        .status(500)
        .type('html')
        .send(
          '<html lang="ar" dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:40px"><h1>تعذّر تحميل المزاد</h1></body></html>',
        );
    }
  }

  sendAssetLinks(res: Response): void {
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
  }
}
