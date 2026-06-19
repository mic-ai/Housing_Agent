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
フロントエンド : Next.js (App Router), TypeScript, Tailwind CSS v4
バックエンド   : Next.js Route Handlers (API)
ORM           : Prisma
DB            : PostgreSQL (Neon)
認証          : NextAuth.js v5
本編動画      : YouTube IFrame API, Instagram oEmbed（外部配置）
顔出し動画    : Supabase Storage（本システム配置・直接配信）
動画アップロード: Supabase Storage（営業マンがダッシュボードからアップロード）
動画尺検証    : @ffprobe-installer/ffprobe（Vercel サーバーレス対応バイナリ）
LINE連携      : LINE Messaging API (@line/bot-sdk)
メール        : Resend
デプロイ      : Vercel（https://homereelmatch.vercel.app）
Embed JS      : Vanilla TypeScript (独立バンドル, Shadow DOM)
テスト        : Vitest + @testing-library/react + happy-dom / Playwright (E2E)
```

---

## ディレクトリ構造

```
homereelmatch/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│       ├── 20260611000000_init/
│       ├── 20260616000000_add_salesperson_role/
│       └── 20260619000000_add_salesperson_password/
├── src/
│   ├── proxy.ts                     ← Next.js middleware（src/middleware.ts は使用しない）
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── (public)/
│   │   │   ├── page.tsx             ← P-01 ポータルホーム
│   │   │   ├── watch/[videoId]/page.tsx       ← P-02 動画視聴
│   │   │   ├── contact/[salespersonId]/page.tsx ← P-03 コンタクト申請
│   │   │   ├── booking/[contactRequestId]/
│   │   │   │   ├── page.tsx         ← P-04 面談予約
│   │   │   │   └── complete/page.tsx ← P-05 予約完了
│   │   │   ├── tag/[tagName]/page.tsx ← P-06 タグ検索結果
│   │   │   └── embed-demo/page.tsx  ← W-01 Embedウィジェットデモ
│   │   ├── (sales)/
│   │   │   ├── login/page.tsx
│   │   │   └── dashboard/
│   │   │       ├── page.tsx
│   │   │       ├── videos/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── new/page.tsx  ← ADMIN のみアクセス可
│   │   │       │   └── [videoId]/edit/page.tsx
│   │   │       ├── inquiries/page.tsx
│   │   │       └── schedule/page.tsx
│   │   ├── (admin)/
│   │   │   └── admin/dashboard/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── videos/
│   │       │   ├── route.ts                     ← GET一覧, POST登録
│   │       │   └── [videoId]/
│   │       │       ├── route.ts                 ← GET, PATCH, DELETE
│   │       │       └── view/route.ts            ← POST viewCount++
│   │       ├── face-videos/
│   │       │   ├── upload/route.ts              ← 顔出し動画アップロード（≤10秒検証）
│   │       │   └── [salespersonVideoId]/route.ts
│   │       ├── hashtags/route.ts
│   │       ├── house-makers/route.ts            ← 公開: 有効なハウスメーカー一覧
│   │       ├── venues/route.ts                  ← 公開: 有効な会場一覧
│   │       ├── contact/
│   │       │   ├── route.ts
│   │       │   └── [contactRequestId]/route.ts
│   │       ├── booking/
│   │       │   ├── slots/route.ts
│   │       │   ├── slots/[slotId]/route.ts
│   │       │   └── confirm/route.ts
│   │       ├── instagram/oembed/route.ts        ← oEmbedプロキシ（24hキャッシュ）
│   │       ├── line/webhook/route.ts
│   │       ├── embed/videos/route.ts            ← CORS対応
│   │       └── admin/
│   │           ├── videos/route.ts
│   │           ├── videos/[videoId]/route.ts
│   │           ├── house-makers/route.ts
│   │           ├── house-makers/[id]/route.ts
│   │           ├── venues/route.ts
│   │           ├── venues/[id]/route.ts
│   │           ├── companies/route.ts
│   │           ├── companies/[companyId]/route.ts
│   │           ├── salespersons/route.ts
│   │           ├── salespersons/[salespersonId]/route.ts
│   │           ├── assignments/route.ts
│   │           └── assignments/[assignmentId]/route.ts
│   ├── components/
│   │   ├── video/
│   │   │   ├── CompositePlayer.tsx    ← PRE_ROLL→MAIN→POST_ROLL→ENDED 状態機械
│   │   │   ├── FaceRollPlayer.tsx     ← <video>タグ、スキップ禁止
│   │   │   ├── MainVideoPlayer.tsx    ← YouTube/Instagram切り替え
│   │   │   ├── VideoFeedClient.tsx    ← 無限スクロールフィード
│   │   │   ├── VideoCard.tsx          ← サムネイルカード（モバイル対応、Client Component）
│   │   │   ├── VideoCardSkeleton.tsx
│   │   │   ├── VideoFooter.tsx
│   │   │   ├── FaceVideoUploader.tsx
│   │   │   └── WatchOverlay.tsx       ← 戻る・シェアボタン・viewCount送信
│   │   ├── search/
│   │   │   ├── SearchBar.tsx
│   │   │   └── HashtagCloud.tsx
│   │   ├── contact/
│   │   │   ├── ContactForm.tsx
│   │   │   └── BookingCalendar.tsx
│   │   ├── embed/
│   │   │   └── EmbedDemoClient.tsx
│   │   ├── sales/
│   │   │   ├── VideoListClient.tsx
│   │   │   ├── VideoNewForm.tsx
│   │   │   ├── VideoEditClient.tsx
│   │   │   ├── InquiriesClient.tsx
│   │   │   └── ScheduleClient.tsx
│   │   └── admin/
│   │       ├── VideoManagerClient.tsx
│   │       ├── HouseMakerManagerClient.tsx
│   │       ├── VenueManagerClient.tsx
│   │       ├── SalespersonManagerClient.tsx
│   │       └── AssignmentManagerClient.tsx
│   ├── lib/
│   │   ├── prisma.ts          ← Prismaクライアントシングルトン
│   │   ├── auth.ts            ← NextAuth v5設定
│   │   ├── admin.ts           ← requireAdmin() / requireSalesperson() ヘルパー
│   │   ├── storage.ts         ← Supabase Storage操作
│   │   ├── video-duration.ts  ← ffprobe による尺検証
│   │   ├── encrypt.ts         ← AES-256-GCM暗号化（questionnaireJson用）
│   │   ├── cors.ts            ← CORS ロジック
│   │   ├── instagram.ts       ← Instagram oEmbed（24hキャッシュ）
│   │   ├── youtube.ts
│   │   ├── line.ts            ← LINE Messaging API
│   │   ├── email.ts           ← Resend
│   │   └── utils.ts
│   ├── types/
│   │   ├── index.ts           ← 全DTO型定義
│   │   └── next-auth.d.ts
│   └── hooks/
│       ├── useVideoFeed.ts
│       └── useIntersectionObserver.ts
├── embed/
│   ├── src/widget.ts
│   ├── dist/embed.js
│   └── vite.config.ts
├── public/
│   └── embed.js               ← embed:build で自動コピー
├── e2e/
│   └── contact-flow.spec.ts
├── vercel.json
└── package.json
```

---

## データベーススキーマ（Prisma）

実際のスキーマは `prisma/schema.prisma` を参照。主要モデルの概要：

```
User           — 一般ユーザー（コンタクト申請者）
Company        — 会社（モデルハウス情報含む）
Salesperson    — 営業マン（email/password/role: SALESPERSON|ADMIN）
HouseMaker     — ハウスメーカー（管理者が登録・管理）
Venue          — 会場（管理者が登録・管理）
Video          — 動画（houseMakerId/venueId FK、area/houseType/priceRange は廃止済み）
SalespersonVideo — 営業マン×動画の顔出し動画設定（preRoll/postRoll ≤10秒）
Hashtag / VideoHashtag
ContactRequest — コンタクト申請（questionnaireJson は AES-256-GCM 暗号化）
Appointment    — 面談予約
AvailableSlot  — 空き時間スロット
```

---

## 環境変数

`.env.local.example` を参照。主要項目：

```bash
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
# ⚠️ channel_binding=require は除去すること（Prisma P1000エラーの原因）

AUTH_SECRET="..."                    # NextAuth必須（NEXTAUTH_SECRET ではない）
NEXTAUTH_URL="http://localhost:3000"

YOUTUBE_API_KEY="..."

SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."

LINE_CHANNEL_SECRET="..."
LINE_CHANNEL_ACCESS_TOKEN="..."

GMAIL_USER="your-gmail@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"  # Googleアカウント → セキュリティ → アプリパスワード

NEXT_PUBLIC_APP_URL="https://homereelmatch.vercel.app"
EMBED_ALLOWED_ORIGINS="https://portal.example.com"

ENCRYPTION_KEY="<64文字のhex>"      # AES-256-GCM鍵（本番必須）
# 生成: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

INSTAGRAM_ACCESS_TOKEN="..."         # Instagram oEmbed用（任意）
```

**重要**: Prisma は `.env.local` を読まない。`prisma migrate deploy` / `prisma db push` には `.env` か環境変数を直接渡す。

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

```typescript
export async function GET(request: NextRequest) {
  try {
    const query = QuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    // ...
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

### 認証・認可

- `src/lib/admin.ts` の `requireAdmin()` / `requireSalesperson()` を使用すること
- API Routes では必ず認証チェック → 所有権チェック（ADMIN は所有権チェック除外）
- 管理者のみ: 動画登録・会社/営業マン/接続設定の管理
- 営業マンのみ: 自分の顔出し動画アップロード・問い合わせ・スケジュール管理

### ロール分離

| ロール | アクセス可能なページ |
|--------|------------------|
| SALESPERSON | `/dashboard`（割り当て済み動画のみ）, `/dashboard/videos/[id]/edit`, `/dashboard/inquiries`, `/dashboard/schedule` |
| ADMIN | `/admin/dashboard`（全管理機能）, 上記全て |

### 動画プレーヤー実装方針

#### 再生シーケンス（CompositePlayer）

```
[プリロール顔出し動画] → [本編動画] → [ポストロール顔出し動画]
  <video>タグ/スキップ不可   YouTube/Instagram IFrame   <video>タグ/スキップ不可
```

```typescript
type PlaybackPhase = "PRE_ROLL" | "MAIN" | "POST_ROLL" | "ENDED";
```

#### 顔出し動画アップロード検証

- ファイル形式: `video/mp4`, `video/webm`, `video/quicktime`
- ファイルサイズ: 50MB 以下
- 尺の上限: **10秒**（ffprobe で server-side 検証）
- Storage パス: `face-videos/{salespersonId}/{videoId}/{pre|post}_{timestamp}.mp4`

#### Instagram oEmbed

- `src/lib/instagram.ts` — `unstable_cache` + 24hキャッシュ
- `GET /api/instagram/oembed` プロキシ経由でブラウザキャッシュも付与
- ended イベント取得不可 → 30秒タイマーで代替

### Embedウィジェット

- Shadow DOM でホストサイト CSS と隔離
- `npm run embed:build` で `public/embed.js` まで自動コピー
- CORS: `EMBED_ALLOWED_ORIGINS` 未設定 = 全許可（開発）、設定時 = 指定 Origin のみ

### 個人情報の取り扱い

- `ContactRequest.questionnaireJson` は `src/lib/encrypt.ts` の `encryptJson()` で暗号化してDBに保存
- レスポンス時のみ `decryptJson()` で復号
- `ENCRYPTION_KEY` 未設定時は plaintext 保存（開発モード、本番では警告ログ）

### LINE Webhook

- `X-Line-Signature` ヘッダーを HMAC-SHA256 で検証（`lib/line.ts` の `validateSignature()` を使用）
- Webhook URL: `https://homereelmatch.vercel.app/api/line/webhook`

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
chore: Prismaマイグレーション追加
refactor: VideoPlayer をサーバー/クライアント分離
```

### ファイル作成時の確認事項

1. Server Component か Client Component かを明示する
2. 新しいAPIエンドポイントを追加したら必ず `src/types/index.ts` にDTO型を追加する
3. 新しいPrismaモデルを追加したら `prisma migrate dev` を実行し、マイグレーションファイルをコミットする
4. 環境変数を追加したら `.env.local.example` も更新する

---

## よくある実装上の注意点

### middleware

- `src/proxy.ts` が middleware として機能する（Next.js の規約から外れた配置）
- `src/middleware.ts` が**存在すると競合**してログインが壊れる — 絶対に作成しないこと

### テスト

- `NextRequest` コンストラクタは Fetch 仕様の forbidden-header により `origin` を除去する → `vi.spyOn(req.headers, "get").mockImplementation(...)` でモック
- `vi.mock()` はルートモジュールに効かないケースがある → `src/__tests__/setup.ts` でグローバルモックを使用
- happy-dom で `toLocaleString("ja-JP")` が "2026/6/20" 形式になる → 日付テキストではなくUI要素で確認
- LINE Webhook: `X-Line-Signature` は HMAC-SHA256 base64

### DB接続

- Neon の `DATABASE_URL` に `channel_binding=require` が含まれると Prisma P1000 エラー → 除去すること
- Prisma は `.env.local` を読まない → `npx prisma db push` 実行時は `.env` か環境変数を直接設定

### デプロイ

- `package.json` の `build`: `"prisma generate && next build"`
- `package.json` の `db:migrate`: `"prisma migrate deploy"`（本番用）
- `package-lock.json` は `.gitignore` に含める（Linux 生成ファイルが Vercel と不整合になる）

### Tailwind v4

- `green-600` は `#00a63e`（v3比で明るい）→ white との contrast 比 3.21:1 で WCAG AA 不合格 → `green-700` を使用

---

## 禁止事項

- `console.log` を本番コードに残さない（`console.error` は可）
- `prisma.$queryRaw` で生SQL記述は原則禁止
- クライアントコンポーネントで直接DBアクセス禁止（必ずAPIを経由）
- 環境変数を `src/` 配下のコードにハードコード禁止
- `NEXT_PUBLIC_` プレフィックスをシークレットキーに使用禁止
- `src/middleware.ts` を作成しないこと（proxy.ts と競合）

---

## コマンドリファレンス

```bash
# 開発サーバー
npm run dev

# テスト
npm run test                         # 全ユニットテスト（154件）
npx vitest run src/__tests__/api/    # API テストのみ
npm run test:e2e                     # E2Eテスト（要DB接続・16件）

# 型チェック
npx tsc --noEmit

# DB操作
npx prisma db push                   # スキーマ同期（開発）
npx prisma migrate deploy            # マイグレーション適用（本番）
npx tsx prisma/seed.ts               # シードデータ投入

# Embed ウィジェット
npm run embed:build                  # ビルド + public/embed.js へコピー

# デプロイ
npx vercel --prod
```

## テスト認証情報（seed データ）

```
管理者:   admin@test.example.com / password123
営業マン: sales@test.example.com / password123
```

---

## 現在の状態（2026-06-19）

全フェーズ実装・本番デプロイ済み。

| 内容 | 状態 |
|------|------|
| 基盤（DB・Auth・API・コンポーネント） | 完了 |
| 顔出し動画アップロード・CompositePlayer | 完了 |
| 営業マンダッシュボード全ページ | 完了 |
| 管理者ダッシュボード（動画・HM・会場・会社・営業マン・接続設定） | 完了 |
| Embed ウィジェット（Shadow DOM） | 完了 |
| API認証・所有権チェック | 完了 |
| 個人情報暗号化（AES-256-GCM） | 完了 |
| Vercel デプロイ | 完了（https://homereelmatch.vercel.app） |
| Playwright E2E テスト | 完了（16件定義済み） |
| Lighthouse（ホーム: Performance 94 / LCP 1.8s / Accessibility 100） | 計測済み |
| Supabase RLS ポリシー | 完了（supabase/rls-policies.sql 適用済み・冪等化） |
| ENCRYPTION_KEY（Vercel 環境変数） | 完了（homereelmatch プロジェクトに設定・再デプロイ済み） |
| Node.js バージョン | 完了（package.json engines: 24.x） |

### 残課題

なし（全設定完了）

### 環境変数メモ

- `ENCRYPTION_KEY`: 生成済み・Vercel homereelmatch に設定済み（`.env.local` にも追加済み）
- `DATABASE_URL`: `.env` の `channel_binding=require` を除去済み（Prisma P1000 対策）
- `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN`: Vercel 本番値設定済み・Webhook 検証 200 OK 確認済み（2026-06-19）
- `GMAIL_USER` / `GMAIL_APP_PASSWORD`: Vercel 設定済み・デプロイ完了（2026-06-19）
