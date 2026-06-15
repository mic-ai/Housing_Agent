# CLAUDE.md — HomeReelMatch

> このファイルはClaude Codeがプロジェクト全体を通じて参照するコンテキスト定義です。
> 実装前に必ずこのファイルを読み、ここに記載された規約・構造・方針に従ってください。

---

## プロジェクト概要

**HomeReelMatch** は住宅情報縦型ショート動画と住宅営業マンをマッチングするWebアプリです。

- YouTube / Instagram に配置された縦型動画を表示
- 営業マンの顔出し部分をユーザー（営業マン）ごとに差し替え可能
- 動画フッターからLINE / メールでのコンタクト申請
- 面談予約（モデルハウス×日時指定）
- 上位の住宅展示場ポータルサイトへのEmbedウィジェット提供
- ハッシュタグによる検索・絞り込み

---

## 技術スタック

```
フロントエンド : Next.js 15 (App Router), TypeScript, Tailwind CSS
バックエンド   : Next.js Route Handlers (API)
ORM           : Prisma
DB            : PostgreSQL (Neon)
認証          : NextAuth.js v5
本編動画      : YouTube IFrame API, Instagram oEmbed（外部配置）
顔出し動画    : Supabase Storage（本システム配置・直接配信）
動画アップロード: Supabase Storage（営業マンがダッシュボードからアップロード）
LINE連携      : LINE Messaging API (@line/bot-sdk)
メール        : Resend
デプロイ      : Vercel
Embed JS      : Vanilla TypeScript (独立バンドル)
```

---

## ディレクトリ構造

```
homereelmatch/
├── CLAUDE.md                    ← このファイル
├── requirements.md              ← 要求定義書
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/                     ← Next.js App Router
│   │   ├── (public)/            ← 一般ユーザー向けルート
│   │   │   ├── page.tsx         ← ポータルホーム（P-01）
│   │   │   ├── watch/
│   │   │   │   └── [videoId]/
│   │   │   │       └── page.tsx ← 動画視聴（P-02）
│   │   │   ├── contact/
│   │   │   │   └── [salespersonId]/
│   │   │   │       └── page.tsx ← コンタクト申請（P-03）
│   │   │   ├── booking/
│   │   │   │   └── [contactRequestId]/
│   │   │   │       └── page.tsx ← 面談予約（P-04）
│   │   │   └── tag/
│   │   │       └── [tagName]/
│   │   │           └── page.tsx ← タグ検索結果（P-06）
│   │   ├── (sales)/             ← 営業マン向けルート
│   │   │   ├── login/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── videos/
│   │   │   │   ├── page.tsx     ← 動画管理一覧
│   │   │   │   ├── new/page.tsx ← 動画新規登録
│   │   │   │   └── [videoId]/
│   │   │   │       └── edit/page.tsx ← 顔出し差し替え
│   │   │   ├── inquiries/page.tsx ← 問い合わせ管理
│   │   │   └── schedule/page.tsx  ← スケジュール管理
│   │   ├── (admin)/             ← 管理者ルート
│   │   │   └── dashboard/page.tsx
│   │   └── api/
│   │       ├── videos/
│   │       │   ├── route.ts               ← GET一覧, POST登録
│   │       │   └── [videoId]/
│   │       │       └── route.ts           ← GET詳細, PATCH, DELETE
│   │       ├── face-videos/
│   │       │   ├── upload/route.ts        ← 顔出し動画アップロード（Supabase Storage）
│   │       │   └── [salespersonVideoId]/
│   │       │       └── route.ts           ← GET, DELETE
│   │       ├── hashtags/route.ts     ← タグ検索
│   │       ├── contact/route.ts      ← コンタクト申請受付
│   │       ├── booking/
│   │       │   ├── slots/route.ts    ← 空き時間取得
│   │       │   └── confirm/route.ts  ← 予約確定
│   │       ├── line/
│   │       │   └── webhook/route.ts  ← LINE Webhook
│   │       └── embed/
│   │           └── videos/route.ts  ← Embedウィジェット用API
│   ├── components/
│   │   ├── video/
│   │   │   ├── CompositePlayer.tsx    ← 顔出し+本編の統合プレーヤー（再生シーケンス制御）
│   │   │   ├── FaceRollPlayer.tsx     ← 顔出し動画プレーヤー（本システム配信 <video>タグ）
│   │   │   ├── MainVideoPlayer.tsx    ← 本編プレーヤー（YouTube/Instagram切り替え）
│   │   │   ├── VideoFeed.tsx          ← スワイプフィード
│   │   │   ├── VideoCard.tsx          ← サムネイルカード
│   │   │   ├── VideoFooter.tsx        ← 営業マン情報・CTAボタン
│   │   │   └── FaceVideoUploader.tsx  ← 顔出し動画アップロードUI（営業マン用）
│   │   ├── search/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   └── HashtagCloud.tsx
│   │   ├── contact/
│   │   │   ├── ContactForm.tsx
│   │   │   └── BookingCalendar.tsx
│   │   ├── salesperson/
│   │   │   └── SalespersonCard.tsx
│   │   └── ui/                      ← shadcn/ui コンポーネント
│   ├── lib/
│   │   ├── prisma.ts                ← Prismaクライアントシングルトン
│   │   ├── auth.ts                  ← NextAuth設定
│   │   ├── youtube.ts               ← YouTube API ユーティリティ
│   │   ├── instagram.ts             ← Instagram oEmbed ユーティリティ
│   │   ├── storage.ts               ← Supabase Storage（顔出し動画アップロード・URL取得）
│   │   ├── line.ts                  ← LINE Messaging API
│   │   ├── email.ts                 ← Resend メール送信
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts                 ← 共通型定義
│   └── hooks/
│       ├── useVideoFeed.ts          ← 無限スクロール・スワイプ管理
│       └── useIntersectionObserver.ts
├── embed/                           ← Embedウィジェット（独立バンドル）
│   ├── src/
│   │   └── widget.ts
│   └── dist/
│       └── embed.js                 ← CDN配信用
├── .env.local.example
└── package.json
```

---

## データベーススキーマ（Prisma）

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String           @id @default(cuid())
  name           String
  email          String?
  phone          String?
  lineId         String?
  createdAt      DateTime         @default(now())
  contactRequests ContactRequest[]

  @@map("users")
}

model Company {
  id                 String        @id @default(cuid())
  name               String
  address            String?
  modelHouseName     String?
  modelHouseAddress  String?
  lat                Float?
  lng                Float?
  salespersons       Salesperson[]
  createdAt          DateTime      @default(now())

  @@map("companies")
}

model Salesperson {
  id             String              @id @default(cuid())
  name           String
  email          String              @unique
  lineId         String?
  profileImage   String?
  bio            String?
  company        Company             @relation(fields: [companyId], references: [id])
  companyId      String
  videoSegments  SalespersonVideo[]
  slots          AvailableSlot[]
  contactRequests ContactRequest[]
  createdAt      DateTime            @default(now())

  @@map("salespersons")
}

model Video {
  id             String              @id @default(cuid())
  platform       Platform
  url            String
  thumbnailUrl   String?
  title          String
  description    String?
  area           String?
  houseType      String?
  priceRange     String?
  viewCount      Int                 @default(0)
  isActive       Boolean             @default(true)
  salespersonVideos SalespersonVideo[]
  videoHashtags  VideoHashtag[]
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  @@map("videos")
}

enum Platform {
  YOUTUBE
  INSTAGRAM
}

// 営業マン×動画の顔出し動画設定テーブル
model SalespersonVideo {
  id                   String      @id @default(cuid())
  video                Video       @relation(fields: [videoId], references: [id])
  videoId              String
  salesperson          Salesperson @relation(fields: [salespersonId], references: [id])
  salespersonId        String

  // プリロール（本編前）: 本システムStorageに配置した顔出し動画
  preRollStoragePath   String?     // Supabase Storage パス（例: face-videos/xxx.mp4）
  preRollPublicUrl     String?     // 配信URL（Supabase Storage public URL）
  preRollDurationSec   Int?        // 実際の尺（≤6秒、アップロード時に検証）

  // ポストロール（本編後）: 同上
  postRollStoragePath  String?
  postRollPublicUrl    String?
  postRollDurationSec  Int?

  isPrimary            Boolean     @default(false)
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt

  @@unique([videoId, salespersonId])
  @@map("salesperson_videos")
}

model Hashtag {
  id            String         @id @default(cuid())
  tagName       String         @unique
  usageCount    Int            @default(0)
  videoHashtags VideoHashtag[]

  @@map("hashtags")
}

model VideoHashtag {
  id        String  @id @default(cuid())
  video     Video   @relation(fields: [videoId], references: [id])
  videoId   String
  hashtag   Hashtag @relation(fields: [hashtagId], references: [id])
  hashtagId String

  @@unique([videoId, hashtagId])
  @@map("video_hashtags")
}

model ContactRequest {
  id              String      @id @default(cuid())
  user            User        @relation(fields: [userId], references: [id])
  userId          String
  salesperson     Salesperson @relation(fields: [salespersonId], references: [id])
  salespersonId   String
  videoId         String?
  contactMethod   ContactMethod
  questionnaireJson Json?
  status          ContactStatus @default(PENDING)
  appointment     Appointment?
  createdAt       DateTime    @default(now())

  @@map("contact_requests")
}

enum ContactMethod {
  LINE
  EMAIL
}

enum ContactStatus {
  PENDING
  RESPONDED
  APPOINTED
  CLOSED
}

model Appointment {
  id               String         @id @default(cuid())
  contactRequest   ContactRequest @relation(fields: [contactRequestId], references: [id])
  contactRequestId String         @unique
  salespersonId    String
  userId           String
  scheduledAt      DateTime
  modelHouseId     String?
  status           AppointmentStatus @default(CONFIRMED)
  createdAt        DateTime       @default(now())

  @@map("appointments")
}

enum AppointmentStatus {
  CONFIRMED
  CANCELLED
  COMPLETED
}

model AvailableSlot {
  id            String      @id @default(cuid())
  salesperson   Salesperson @relation(fields: [salespersonId], references: [id])
  salespersonId String
  startAt       DateTime
  endAt         DateTime
  isBooked      Boolean     @default(false)
  createdAt     DateTime    @default(now())

  @@map("available_slots")
}
```

---

## 環境変数

```bash
# .env.local

# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# YouTube
YOUTUBE_API_KEY="..."

# Supabase Storage（顔出し動画配置）
SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."         # サーバーサイドのみ使用
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."     # 公開URL生成用

# LINE Messaging API
LINE_CHANNEL_SECRET="..."
LINE_CHANNEL_ACCESS_TOKEN="..."

# Resend（メール送信）
RESEND_API_KEY="..."
FROM_EMAIL="noreply@homereelmatch.example.com"

# Embed Widget
NEXT_PUBLIC_APP_URL="https://homereelmatch.example.com"
EMBED_ALLOWED_ORIGINS="https://portal.example.com,https://another.example.com"
```

---

## 実装規約

### TypeScript

- `strict: true` を維持すること
- `any` 型は原則禁止。やむを得ない場合は `// eslint-disable-next-line @typescript-eslint/no-explicit-any` とコメントを添えること
- API ResponseのDTOは `src/types/index.ts` に集約すること

### コンポーネント設計

- Server Components をデフォルトとし、インタラクティブ処理にのみ `"use client"` を付与すること
- データフェッチはServer Componentで行い、Propsとして渡すこと
- フォームは `react-hook-form` + `zod` でバリデーションすること

### API Routes

すべてのRoute Handlerは以下のパターンに従うこと：

```typescript
// src/app/api/videos/route.ts の例
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const QuerySchema = z.object({
  tag: z.string().optional(),
  area: z.string().optional(),
  limit: z.coerce.number().default(20),
  cursor: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = QuerySchema.parse(Object.fromEntries(searchParams));
    // ... 処理
    return NextResponse.json({ data, nextCursor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

### 動画プレーヤー実装方針

#### 再生シーケンス（CompositePlayer）

```
[プリロール顔出し動画] → [本編動画] → [ポストロール顔出し動画]
        ↑                    ↑                   ↑
  <video>タグで再生    YouTube/Instagram     <video>タグで再生
  本システム配信          IFrame埋め込み       本システム配信
  スキップ不可           通常再生             スキップ不可
```

CompositePlayer の状態機械：

```typescript
type PlaybackPhase =
  | "PRE_ROLL"   // プリロール再生中（preRollPublicUrl が存在する場合）
  | "MAIN"       // 本編再生中
  | "POST_ROLL"  // ポストロール再生中（postRollPublicUrl が存在する場合）
  | "ENDED";     // 全フェーズ完了

// フェーズ遷移:
// PRE_ROLL終了 → MAIN開始
// MAIN終了     → POST_ROLL開始（なければENDED）
// POST_ROLL終了 → ENDED
```

#### FaceRollPlayer（顔出し動画）

```typescript
// HTML5 <video> タグを使用（本システム配信URL）
// controls={false} でUI非表示（スキップ・シーク禁止）
// autoPlay, playsInline, muted={false}
// onEnded で親コンポーネントに次フェーズ遷移を通知
// 尺の上限: 6秒（アップロードAPIで server-side 検証）
```

#### MainVideoPlayer（本編動画）

```typescript
// YouTube: IFrame API を使用
//   - onStateChange(YT.PlayerState.ENDED) で次フェーズへ遷移
// Instagram: oEmbed HTMLを dangerouslySetInnerHTML で挿入
//   - Instagram は ended イベント取得不可のため、
//     動画の estimated_duration をDBに保存しタイマーで代替
```

#### 顔出し動画アップロード検証（サーバーサイド）

```typescript
// src/app/api/face-videos/upload/route.ts
// 1. ファイル形式: video/mp4, video/webm, video/quicktime のみ許可
// 2. ファイルサイズ: 50MB 以下
// 3. 尺の検証: ffprobe（または動画メタデータ解析）で duration ≤ 6秒を確認
//    → 超過した場合は 400 エラーで拒否
// 4. 検証通過後に Supabase Storage の face-videos/ バケットへアップロード
// 5. StorageパスとpublicUrlをDBの SalespersonVideo に保存
```

#### Supabase Storage バケット設計

```
バケット名: face-videos
アクセス: Public（動画URLを直接 <video src> に渡すため）
パス構造: face-videos/{salespersonId}/{videoId}/{pre|post}_{timestamp}.mp4
RLS: アップロードは認証済み営業マン本人のみ
     閲覧は全員可（Public）
```

### Embedウィジェット

```typescript
// embed/src/widget.ts
// - Shadow DOMで外部サイトのCSSと競合させない
// - 依存ライブラリなし（Vanilla TS のみ）
// - APIエンドポイント: GET /api/embed/videos?count=5&tag=新着
// - CORS: EMBED_ALLOWED_ORIGINS に登録されたオリジンのみ許可
// - クリック時は本アプリの動画URLへwindow.openまたはlocation.href
```

### LINE通知テンプレート

```typescript
// lib/line.ts に集約
// コンタクト申請受信時（営業マン宛）:
//   「【新規問い合わせ】{ユーザー名}様から連絡希望が届きました。
//    動画: {動画タイトル} / 希望連絡: {LINE|メール}
//    ダッシュボードを確認してください: {url}」

// 予約確定時（ユーザー宛）:
//   「ご予約が確定しました！
//    担当: {営業マン名}（{会社名}）
//    日時: {scheduledAt}
//    場所: {modelHouseName} {modelHouseAddress}」
```

---

## 開発ルール

### 命名規則

| 種別 | 規則 | 例 |
|------|------|----|
| コンポーネント | PascalCase | `VideoPlayer.tsx` |
| hooks | camelCase + `use`プレフィックス | `useVideoFeed.ts` |
| API routes | kebab-case ディレクトリ | `api/embed/videos/` |
| DB カラム | camelCase（Prisma） → snake_case（DB） | `thumbnailUrl` → `thumbnail_url` |
| 環境変数 | UPPER_SNAKE_CASE | `LINE_CHANNEL_SECRET` |

### コミットメッセージ（Conventional Commits）

```
feat: 動画フィード無限スクロール実装
fix: 顔出しセグメントのタイムスタンプズレ修正
docs: CLAUDE.md に LINE通知テンプレート追記
chore: Prismaマイグレーション追加
refactor: VideoPlayer をサーバー/クライアント分離
```

### ファイル作成時の確認事項

1. Server Component か Client Component かを明示する
2. 新しいAPIエンドポイントを追加したら必ず `src/types/index.ts` にDTO型を追加する
3. 新しいPrismaモデルを追加したら `prisma migrate dev` を実行し、マイグレーションファイルをコミットする
4. 環境変数を追加したら `.env.local.example` も更新する

---

## フェーズ別実装順序

### Phase 1: 基盤（最初に実装）

```
1. prisma/schema.prisma 全モデル定義
2. prisma migrate dev
3. src/lib/prisma.ts（シングルトン）
4. src/lib/storage.ts（Supabase Storageクライアント・アップロード・URL取得）
5. NextAuth設定（営業マンのメール/パスワード認証）
6. P-01: ポータルホーム（動画カード一覧、サムネイル表示）
7. P-02: 動画視聴ページ（CompositePlayer基本版: 本編のみ再生）
8. VideoFeed（スワイプUI）
```

### Phase 2: コア機能

```
1. FaceRollPlayer（<video>タグ、スキップ禁止）
2. CompositePlayer 状態機械（PRE_ROLL→MAIN→POST_ROLL→ENDED）
3. POST /api/face-videos/upload（尺検証 ≤6秒・Storageアップロード）
4. S-03: 顔出し動画アップロードUI（FaceVideoUploader）
5. ハッシュタグ検索・絞り込み（SearchBar, FilterPanel）
6. P-06: タグ検索結果ページ
7. P-03: コンタクト申請フォーム（個人情報 + アンケート）
8. LINE通知（lib/line.ts）
9. メール通知（lib/email.ts）
10. VideoFooter: CTAボタン（LINE/メール）
```

### Phase 3: マッチング

```
1. P-04: 面談予約（BookingCalendar）
2. S-02: 営業マンダッシュボード
3. S-03: 動画管理（登録・顔出し差し替え）
4. S-04: 問い合わせ管理
5. S-05: スケジュール管理
```

### Phase 4: Embed

```
1. GET /api/embed/videos（CORS設定込み）
2. embed/src/widget.ts（Shadow DOM実装）
3. embed/dist/embed.js ビルド設定
4. W-01: ウィジェットデモページ
```

### Phase 5: 品質

```
1. E2Eテスト（Playwright）: コンタクト申請フロー
2. Lighthouse スコア確認（LCP < 2.5s）
3. モバイルUI調整
4. セキュリティ: RLS（Row Level Security）設定確認
```

---

## よくある実装上の注意点

### Instagram oEmbed

```typescript
// Access Token が必要（Facebook Developer App登録）
// レートリミットに注意: キャッシュ必須（Redis or DB）
// 縦型動画かどうかはoEmbedのメタデータから判定不可 → 手動設定
```

### 顔出し動画アップロード（営業マンダッシュボード）

```typescript
// 設定手順:
// 1. 本編動画（管理者承認済み）を選択
// 2. プリロール動画ファイルを選択してアップロード（任意）
// 3. ポストロール動画ファイルを選択してアップロード（任意）
// 4. プレビュー: CompositePlayer で実際の再生順を確認
// 5. 保存

// FaceVideoUploader コンポーネントの責務:
// - ファイル選択UI（ドラッグ&ドロップ対応）
// - POST /api/face-videos/upload へmultipart/form-dataで送信
// - アップロード進捗表示
// - 既存動画の置き換え（同salespersonId×videoId×pre/postの上書き）
// - 古いStorageファイルの削除（PUT時にサーバーサイドで実施）
```

### LINE Webhook検証

```typescript
// X-Line-Signature ヘッダーの検証を必ず行うこと
// lib/line.ts の validateSignature() を使用
// Next.js Route HandlerではbodyをRaw Bufferで取得する必要あり
```

### 個人情報の取り扱い

```typescript
// ContactRequest.questionnaireJson は暗号化してDBに保存
// 表示時のみ復号
// データ保持期間: 2年（ポリシー文書と合わせて設定）
```

---

## 禁止事項

- `console.log` を本番コードに残さない（`console.error` は可）
- `prisma.$queryRaw` で生SQL記述は原則禁止（パフォーマンス要件がある場合のみ許可・コメント必須）
- クライアントコンポーネントで直接DBアクセス禁止（必ずAPIを経由）
- 環境変数を `src/` 配下のコードにハードコード禁止
- `NEXT_PUBLIC_` プレフィックスをシークレットキーに使用禁止

---

## 実装進捗ログ

### Phase 1 完了（2026-06-11）

#### 環境・設定
- パッケージマネージャーは **yarn** を使用（`npm install` はDockerオーバーレイfsのENOTEMPTYエラーで失敗するため）
- Next.js 16 では `middleware.ts` が非推奨 → `src/proxy.ts` に変更
- `homereelmatch/.env.local.example` 作成済み（実際の認証情報は別途設定が必要）
- `prisma/schema.prisma` 全モデル定義済み（DBへの `prisma migrate dev` は未実施）

#### 実装済みファイル一覧

**lib/**
- `src/lib/prisma.ts` — Prismaクライアントシングルトン
- `src/lib/storage.ts` — Supabase Storage（uploadFaceVideo / deleteFaceVideo / getFaceVideoPublicUrl）
- `src/lib/auth.ts` — NextAuth v5 Credentialsプロバイダー（Salespersonのメール/パスワード認証）
- `src/lib/line.ts` — LINE Messaging API通知（新規問い合わせ・予約確定）
- `src/lib/email.ts` — Resendメール送信（新規問い合わせ・予約確定）
- `src/lib/utils.ts` — cn(), mapVideoToDTO(), formatDate(), formatDateTime(), extractYouTubeId()

**types/**
- `src/types/index.ts` — 全DTO型定義（VideoDTO, SalespersonDTO, ContactRequestDTO 等）

**API Routes**
- `GET/POST /api/videos` — 動画一覧（カーソルページネーション）・登録
- `GET/PATCH/DELETE /api/videos/[videoId]` — 動画詳細・更新・論理削除
- `GET /api/hashtags` — ハッシュタグ一覧（usageCount降順）
- `POST /api/contact` — コンタクト申請（LINE/メール通知付き）
- `GET /api/booking/slots` — 営業マンの空き時間取得
- `POST /api/booking/confirm` — 面談予約確定（スロット更新・通知付き）
- `GET /api/embed/videos` — Embedウィジェット用（CORS対応）
- `GET/POST /api/auth/[...nextauth]` — NextAuth認証ハンドラー

**コンポーネント**
- `VideoCard` — 9:16サムネイルカード
- `VideoFooter` — 営業マン情報・LINE/メールCTAボタン・ハッシュタグリンク
- `FaceRollPlayer` — `<video>`タグ、controls非表示（スキップ禁止）
- `MainVideoPlayer` — YouTube IFrame API / Instagram oEmbed切り替え
- `CompositePlayer` — PRE_ROLL → MAIN → POST_ROLL → ENDED 状態機械
- `VideoFeedClient` — IntersectionObserverによる無限スクロールフィード
- `SearchBar` — 検索フォーム（クライアントコンポーネント）
- `HashtagCloud` — 人気タグ一覧（サーバーコンポーネント）
- `ContactForm` — react-hook-form + zodバリデーション
- `BookingCalendar` — 面談予約日時選択UI

**Pages**
- `(public)/page.tsx` — P-01 ポータルホーム（サムネイルグリッド・検索・ハッシュタグ）
- `(public)/watch/[videoId]/page.tsx` — P-02 動画視聴（CompositePlayer）
- `(public)/contact/[salespersonId]/page.tsx` — P-03 コンタクト申請
- `(public)/booking/[contactRequestId]/page.tsx` — P-04 面談予約
- `(public)/tag/[tagName]/page.tsx` — P-06 タグ検索結果
- `(sales)/login/page.tsx` — S-01 営業マンログイン
- `(sales)/dashboard/page.tsx` — S-02 ダッシュボード（問い合わせ数・動画数・直近予約）

#### 技術的注意点（実装中に判明）
- Prismaの`queryRaw`ではなく通常のORMクエリのみ使用
- `mapVideoToDTO()` でPrismaの`videoHashtags`フィールドをDTOの`hashtags`に変換している（VideoCardなどのコンポーネントが`hashtags`を参照するため）
- Prisma JsonフィールドへのnullセットはPrisma.JsonNullではなく`undefined`を渡す（型エラー回避）
- YouTubeプレーヤーの`onEnded`イベントで次フェーズへ遷移、InstagramはoEmbed埋め込み（ended取得不可）

---

### Phase 2 完了（2026-06-15）

#### テスト環境
- **Vitest + @testing-library/react + happy-dom** 導入（`npm run test`）
- `src/__tests__/setup.ts` に Prisma / Supabase Storage / NextAuth のグローバルモック設定
- fetch モックは `vi.stubGlobal("fetch", vi.fn())` + `afterEach(() => vi.unstubAllGlobals())` パターンを使用
- 合計 **54テスト** 全通過、型エラーなし

#### 実装済みファイル一覧（Phase 2）

**API Routes**
- `POST /api/face-videos/upload` — ファイル形式・サイズ(50MB)・尺(≤6s)検証 + Supabase Storage アップロード
- `GET/DELETE /api/face-videos/[salespersonVideoId]` — 取得・削除（Storageファイルも連動削除）

**lib/**
- `src/lib/video-duration.ts` — ffprobe による動画尺検証（一時ファイル経由）

**コンポーネント**
- `FaceVideoUploader` — ドラッグ&ドロップ・進捗バー・クライアントバリデーション（src/components/video/）
- `FilterPanel` — エリア/建物タイプ/価格帯フィルター + リセット（src/components/search/）
- `VideoListClient` — 営業マン動画管理一覧（非公開バッジ・顔出し設定リンク）（src/components/sales/）
- `ScheduleClient` — 空き時間スロット管理（追加・削除・予約済バッジ）（src/components/sales/）

**修正**
- `extractYouTubeId` — 生ID（11文字）のパススルー対応

#### 技術的注意点（Phase 2 実装中に判明）
- yarn は Docker overlay fs の EIO エラーで `.bin` rmdir が失敗するため **npm** を使用（devDependencies の追加は npm）
- happy-dom では `toLocaleString("ja-JP")` が "2026/6/20" 形式になる（"2026年6月20日" にならない）→ テストは日付テキストではなく UI 要素（削除ボタン等）の出現で状態を確認
- happy-dom の `<input accept="...">` は `userEvent.upload` で MIME タイプフィルタをかける → 非対応ファイルのテストには `fireEvent.change` + `Object.defineProperty(input, "files", ...)` を使用
- `expect.anything()` は `undefined` に一致しない → 引数なしの fetch 呼び出しに使う場合は `mock.calls[0][0]` で直接確認

### Phase 3 以降（未実装）

```
- (sales)/dashboard/videos/ — 動画管理ページ（一覧・新規登録・顔出し差し替え）
- (sales)/dashboard/inquiries/ — 問い合わせ管理ページ
- (sales)/dashboard/schedule/ — スケジュール管理ページ（ScheduleClient を組み込み）
- (admin)/dashboard/ — 管理者画面
- /api/line/webhook — LINE Webhook（署名検証付き）
- embed/src/widget.ts — Embedウィジェット（Vanilla TS、Shadow DOM）
- prisma migrate dev（本番DB接続後に実行）
```
