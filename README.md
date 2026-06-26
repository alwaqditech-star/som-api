# SOM Auctions API 🚗

منصة مزادات سيارات متكاملة - Backend API مبني بـ **NestJS** + **PostgreSQL** + **Socket.IO**

## المميزات

- **مصادقة JWT** - تسجيل، دخول، تجديد Token
- **إدارة المستخدمين** - مشترين، بائعين، إداريين
- **محفظة رقمية** - إيداع، سحب، ودائع المزادات
- **إدارة السيارات** - إضافة، مراجعة، اعتماد
- **المزادات** - مجدولة، مباشرة (Live)، مؤقتة
- **مزايدات مباشرة** - WebSocket (Socket.IO) في الوقت الفعلي
- **تمديد تلقائي** - Anti-sniping عند المزايدة قبل انتهاء المزاد
- **إشعارات** - تجاوز المزايدة، الفوز، وغيرها
- **Swagger Docs** - توثيق API تفاعلي

## البنية

```
api/
├── src/
│   ├── main.ts                 # نقطة الدخول
│   ├── app.module.ts
│   ├── config/                 # إعدادات DB & JWT
│   ├── common/                 # Guards, Decorators, Enums
│   ├── database/seed.ts        # بيانات تجريبية
│   └── modules/
│       ├── auth/               # المصادقة
│       ├── users/              # المستخدمون
│       ├── wallets/            # المحفظة
│       ├── vehicles/           # السيارات
│       ├── auctions/           # المزادات + WebSocket Gateway
│       ├── bids/               # المزايدات
│       ├── notifications/      # الإشعارات
│       └── categories/         # الماركات والتصنيفات
├── docker-compose.yml          # PostgreSQL + API
└── .env.example
```

## التشغيل السريع

### 1. باستخدام Docker (موصى به)

```bash
cd api
cp .env.example .env
docker-compose up -d
```

### 2. تشغيل محلي

```bash
cd api
cp .env.example .env
npm install

# تشغيل PostgreSQL (Docker)
docker-compose up -d postgres

# تشغيل API
npm run start:dev

# تعبئة بيانات تجريبية
npm run seed
```

- **API**: http://localhost:3000/api/v1
- **Swagger**: http://localhost:3000/api/docs
- **WebSocket**: ws://localhost:3000/auctions

## حسابات تجريبية

| الدور | البريد | كلمة المرور |
|-------|--------|-------------|
| Admin | admin@som.sa | Admin123! |
| Seller | seller@som.sa | Admin123! |
| Buyer | buyer@som.sa | Admin123! |

## REST API - أهم المسارات

| Method | Path | الوصف |
|--------|------|-------|
| POST | `/auth/register` | تسجيل |
| POST | `/auth/login` | دخول |
| GET | `/auctions/live` | المزادات المباشرة |
| GET | `/auctions/:id` | تفاصيل مزاد |
| POST | `/auctions/:id/join` | الانضمام (وديعة) |
| POST | `/bids/auctions/:id` | مزايدة (REST) |
| GET | `/vehicles` | قائمة السيارات |
| GET | `/wallets/me` | المحفظة |
| POST | `/wallets/deposit` | إيداع |

## WebSocket - المزادات المباشرة

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/auctions', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

// الانضمام لغرفة مزاد
socket.emit('join_auction', { auctionId: 'uuid-here' });

// استقبال حالة المزاد
socket.on('auction_state', (data) => console.log(data));

// تقديم مزايدة
socket.emit('place_bid', { auctionId: 'uuid', amount: 76000 });

// استقبال مزايدة جديدة
socket.on('new_bid', (bid) => console.log('مزايدة جديدة:', bid));

// تجاوز مزايدتك
socket.on('outbid', (data) => console.log('تم تجاوزك!', data));

// تحديث المزاد (سعر، وقت)
socket.on('auction_updated', (data) => console.log(data));

// عدد المشاهدين
socket.on('viewers_count', ({ count }) => console.log('مشاهدون:', count));
```

### أحداث WebSocket

| Event (Client → Server) | الوصف |
|-------------------------|-------|
| `join_auction` | الانضمام لغرفة مزاد |
| `leave_auction` | مغادرة الغرفة |
| `place_bid` | تقديم مزايدة |
| `get_auction_status` | حالة المزاد |

| Event (Server → Client) | الوصف |
|-------------------------|-------|
| `auction_state` | الحالة الكاملة عند الانضمام |
| `new_bid` | مزايدة جديدة |
| `outbid` | تم تجاوز مزايدتك |
| `auction_updated` | تحديث السعر/الوقت |
| `auction_started` | بدء المزاد |
| `auction_ended` | انتهاء المزاد |
| `viewers_count` | عدد المشاهدين |

## ربط Flutter

```dart
// pubspec.yaml
// socket_io_client: ^3.0.0
// dio: ^5.0.0

final socket = io('http://localhost:3000/auctions', <String, dynamic>{
  'transports': ['websocket'],
  'auth': {'token': accessToken},
});

socket.emit('join_auction', {'auctionId': auctionId});
socket.on('new_bid', (data) => updateUI(data));
```

## متغيرات البيئة

| Variable | Default | الوصف |
|----------|---------|-------|
| `PORT` | 3000 | منفذ API |
| `DB_HOST` | localhost | PostgreSQL |
| `DB_DATABASE` | som_auctions | اسم القاعدة |
| `JWT_SECRET` | - | مفتاح JWT |
| `AUCTION_BID_EXTENSION_SECONDS` | 120 | تمديد المزاد عند المزايدة |
| `AUCTION_MIN_DEPOSIT_PERCENT` | 5 | نسبة الوديعة |

## License

Private - SOM Platform
