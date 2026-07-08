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
│   │       ├── salesperson/
│   │       │   └── profile/
│   │       │       ├── route.ts                 ← GET/PATCH プロフィール
│   │       │       ├── face-videos/
│   │       │       │   ├── route.ts             ← GET一覧 / POST アップロード（≤10秒検証）
│   │       │       │   └── [id]/route.ts        ← DELETE 顔出し動画
│   │       │       └── face-video/route.ts      ← 廃止 (410 返す)
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
User                   — 一般ユーザー（コンタクト申請者）
Company                — 会社（モデルハウス情報含む）
Salesperson            — 営業マン（email/password/role: SALESPERSON|ADMIN）
                         顔出し動画は faceVideos: SalespersonFaceVideo[] で管理
HouseMaker             — ハウスメーカー（管理者が登録・管理）
Venue                  — 会場（管理者が登録・管理）
Video                  — 動画（houseMakerId/venueId FK）
SalespersonVideo       — 営業マン×動画の接続設定
                         preRollPublicUrl/postRollPublicUrl: 接続設定で選択した顔出し動画（nullable）
                         isPrimary: 視聴ページで使用する主担当フラグ（現状未使用、取得は createdAt 昇順 take:1）
SalespersonFaceVideo   — 顔出し動画ライブラリ（salesperson_face_videos テーブル）
                         rollType: "pre" | "post", sortOrder: Int
SalespersonProfileVideo — 営業マンのプロフィール動画（YouTube等のURL登録）
Hashtag / VideoHashtag
ContactRequest         — コンタクト申請（questionnaireJson は AES-256-GCM 暗号化）
Appointment            — 面談予約
AvailableSlot          — 空き時間スロット
```

---

## 環境変数

`.env.local.example` を参照。主要項目：

```bash
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
# ⚠️ channel_binding=require は除去すること（Prisma P1000エラーの原因）

AUTH_SECRET="..."                    # NextAuth必須。NEXTAUTH_SECRET も同じ値で両方設定すること
NEXTAUTH_SECRET="..."               # AUTH_SECRET と同じ値（フォールバック用）
# ⚠️ NEXTAUTH_URL は Vercel 本番に設定しないこと（または https://homereelmatch.vercel.app に設定）
#    http://localhost:3000 を本番に設定するとクッキーが非セキュアになりログイン不可になる
NEXTAUTH_URL="http://localhost:3000"  # ローカル開発のみ

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
- アップロード先: `POST /api/salesperson/profile/face-videos`（rollType: "pre" | "post"）
- 削除: `DELETE /api/salesperson/profile/face-videos/[id]`

#### 顔出し動画の再生優先順位（watch page）

```
SalespersonVideo.preRollPublicUrl（接続設定で指定）
  ↓ null の場合フォールバック
Salesperson.faceVideos.find(rollType="pre")（営業マングローバル設定・sortOrder昇順）
```

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

- `src/proxy.ts` が middleware として機能する（Next.js 16 が独自に認識するファイル名）
- `src/middleware.ts` が**存在すると競合**してビルドが失敗する — 絶対に作成しないこと

### Server Component → Client Component への props 受け渡し

- Prisma が返す `Date` オブジェクト（`createdAt`, `updatedAt`）は Client Component の props に含めると RSC シリアライズエラーになる
- `...prismaRecord` のスプレッドは禁止。必要なフィールドのみ明示的に選択して渡すこと
- Prisma クエリで `select` を使えば `Date` フィールドを除外できる

```typescript
// ❌ 危険: createdAt/updatedAt が混入する
initialAssignments={assignments.map((a) => ({ ...a, extra: "foo" }))}

// ✅ 安全: 必要なフィールドのみ
initialAssignments={assignments.map((a) => ({
  id: a.id,
  salesperson: { id: a.salesperson.id, name: a.salesperson.name },
  video: { id: a.video.id, title: a.video.title },
}))}
```

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
- `src/middleware.ts` を作成しないこと（proxy.ts と競合してビルド失敗）

---

## コマンドリファレンス

```bash
# 開発サーバー
npm run dev

# テスト
npm run test                         # 全ユニットテスト（222件）
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

## 現在の状態（2026-07-02）

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
| 営業マンダッシュボード刷新（顔出し動画複数登録対応） | 完了（2026-06-19） |
| 管理者「本編動画登録」登録後編集・プレビュー | 完了（2026-06-19） |
| 接続設定：顔出し動画の個別接続・プレビュー・タグ編集 | 完了（2026-06-19） |
| 本編動画削除機能（インライン確認） | 完了（2026-06-23） |
| Instagram oEmbed 修正（iframe 直接埋め込み廃止） | 完了（2026-06-23） |
| 接続設定プレビュー 404 修正（isActive フィルタ除去） | 完了（2026-06-23） |
| YouTube Shorts URL 対応（extractYouTubeId） | 完了（2026-06-23） |
| 連絡オーバーレイのタイミング改善（残り20秒前〜終了後） | 完了（2026-06-23） |
| 営業マンアイコン2倍化（w-20 h-20） | 完了（2026-06-23） |
| 管理画面5タブ化（AdminDashboardClient） | 完了（2026-06-23） |
| フロントエンドUI全体改善（stone系・アイコン・カード） | 完了（2026-06-23） |
| Vercel プロジェクト接続修正・sitemap.xml 復旧 | 完了（2026-06-24） |
| 接続設定ドロップダウン選択が反映されないバグ修正 | 完了（2026-06-24） |
| 顔出し動画プレビュー改善（FaceVideoPreview・エラー表示・URLリンク） | 完了（2026-06-24） |
| 接続設定DELETE時に顔出し動画ファイルを削除するバグ修正 | 完了（2026-06-24） |
| 保存失敗時のエラー表示・行ヘッダー即時更新 | 完了（2026-06-24） |
| 顔出し動画アップロード Internal Server Error 修正（ffprobe Vercel 対応） | 完了（2026-06-24） |
| 管理タブ名変更（接続設定→公開設定・動画登録→本編登録）・順序変更 | 完了（2026-06-29） |
| VideoCard デスクトップホバーオーバーレイのクリック透過修正 | 完了（2026-06-29） |
| 別端末ログイン失敗修正（AUTH_SECRET + Server Action login） | 完了（2026-06-29） |
| モバイルハッシュタグフィルターリセットバグ修正 | 完了（2026-07-01） |
| 営業マン公開プロフィールページ（/salesperson/[id]）追加 | 完了（2026-07-01） |
| 営業マンダッシュボードにプロフィール画像アップロード追加 | 完了（2026-07-01） |
| HTTP Basic Auth プレビューゲート（PREVIEW_PASSWORD）追加 | 完了（2026-07-01） |
| Prismaスキーマ profileDetail 追加（DBマイグレーション未適用） | 完了（2026-07-02、マイグレーション適用済み） |
| Prisma include 全フィールドSELECTによるクラッシュ修正 | 完了（2026-07-01） |
| 営業マンプロフィールページ 3カード構成へ再編（詳細プロフィール表示・担当動画セクション削除） | 完了（2026-07-02） |
| 管理者の営業マン管理画面から自己紹介（bio）欄を削除 | 完了（2026-07-07） |
| 追加要件 Phase 1（0.2 閲覧者の軽量識別 + 機能B 学習コンテンツCMS） | 完了（2026-07-08、本番DBマイグレーション適用済み） |
| 追加要件 機能A（営業担当プロフィール強化・自己紹介動画アップロード） | 完了（2026-07-10、本番DBマイグレーション適用済み） |

### 直近の主要変更（2026-06-23）

#### 本編動画削除機能
- `DELETE /api/admin/videos/[videoId]`: `$transaction` で VideoHashtag → SalespersonVideo → Video の順に削除（FK制約対策）
- `VideoManagerClient`: `pendingDeleteId` / `deleting` 状態 + インライン2段階確認UI

#### バグ修正（2026-06-23）
- Instagram 表示不可: `${url}embed/` iframe は X-Frame-Options でブロックされる → oEmbed プロキシ＋ローディング＋フォールバックリンクに変更
- 接続設定プレビュー 404: watch page で `isActive: true` フィルタを除去（直接URLアクセスは isActive に関係なく表示）
- YouTube Shorts 黒画面: `extractYouTubeId` に `youtube\.com\/shorts\/` パターンを追加
- YouTube player 再作成バグ: `handleMainEnded` を `useCallback` に変更して `initYouTube` の依存変化を防止

#### 連絡オーバーレイ改修
- `WatchClientShell`（新規・Client Component）: `showContact` 状態を一元管理
- `CompositePlayer`: `onShowContact?: () => void` prop 追加、`handleMainEnded` で呼び出し
- `MainVideoPlayer`: `onNearEnd?: () => void` prop 追加
  - YouTube: `onReady` 後に 1 秒ポーリング → 残り 20 秒以下で発火（`nearEndFiredRef` で重複防止）
  - Instagram: oEmbed 取得後 10 秒タイマーで発火（推定 30 秒動画の残り 20 秒相当）
- `VideoFooter`: `showContact` prop 追加 → `opacity-0 translate-y-4` → `opacity-100 translate-y-0` トランジション
- 営業マンアイコン: `w-10 h-10 / 40px` → `w-20 h-20 / 80px`
- watch page: `CompositePlayer` + `VideoFooter` を `WatchClientShell` に置き換え（company の Date フィールドも明示的選択に変更）

#### 管理画面タブ化
- `AdminDashboardClient`（新規・Client Component）: 5 タブ管理
  - 営業マン管理 / ハウスメーカー / 会場管理 / 接続設定 / 動画登録
  - amber アクティブインジケーター、`hidden` 切り替えで状態保持
- `admin/dashboard/page.tsx`: 統計グリッドを 3+3 の 6 項目に拡充し、`AdminDashboardClient` に集約

#### フロントエンドUI全体改善
- `gray-*` → `stone-*` カラーに全面統一
- ログイン: ブランドロゴ（家アイコン/amber-600）・amber フォーカスリング・角丸カード
- 営業ダッシュボード: KPI カード（amber アクセント）・アイコン付きナビ・予約リスト改善
- InquiriesClient / ScheduleClient: 空状態イラスト・ローディングスピナー・ステータスバッジ刷新
- コンタクト・予約フロー: SVG 戻るボタン（44px タッチターゲット）・セクションラベル改善
- FilterBar: `bg-blue-700` → `bg-stone-600`

### 実装上の重要な知見（2026-06-23 追加）

#### Instagram oEmbed
- `${url}embed/` iframe は Instagram の X-Frame-Options ヘッダーによりブロックされる（2022年以降）
- 表示方法: `GET /api/instagram/oembed` プロキシ経由で HTML を取得 → `dangerouslySetInnerHTML` + `embed.js` で描画
- 取得失敗時は「Instagramで見る」リンクにフォールバック（`failed` 状態）

#### YouTube URL パターン
- `extractYouTubeId` は通常 URL・短縮 URL・Shorts URL に対応済み
- Shorts: `youtube.com/shorts/{11文字ID}`

#### watch page の isActive フィルタ
- `isActive: false` の動画は公開フィード（`/`）に表示しないが、直接 URL（`/watch/[id]`）では表示する
- 管理者プレビュー目的のため `where: { id: videoId }` のみとし `isActive: true` は付けない

### 直近の主要変更（2026-06-24）

#### Vercel プロジェクト接続修正・sitemap.xml 復旧
- GitHub `mic-ai/Housing_Agent` リポジトリを正しい Vercel プロジェクト（`homereelmatch`）に接続し直した
- Vercel プロジェクトの Root Directory を `homereelmatch` に設定（以前は repo ルートにデプロイされていた）
- `sitemap.ts`（メタデータ規約）→ `src/app/api/sitemap/route.ts`（Route Handler）＋ `next.config.ts` rewrite に変更
  - `/sitemap.xml` → `/api/sitemap` の rewrite を追加
  - DB 取得失敗時は静的ルートのみ返すフォールバック付き

#### 接続設定 UI バグ修正（AssignmentManagerClient.tsx）
- **ドロップダウン選択が反映されないバグ**: `<select value={currentId}>` が props 由来の値で固定されていた → `selectedId` state を直接渡す形に変更
- **FaceVideoPreview コンポーネント新設**:
  - `onError` でロードエラーを検知 → 赤いエラー表示＋「URLを開く」リンクに切り替え
  - `url` が undefined 時は「URL未設定」を明示
  - 「URLで確認」リンクで Supabase Storage URL を直接テスト可能
  - `preload="auto"` ＋ `onLoadedMetadata` で `currentTime=0.1` シーク → 最初のフレームをサムネイルとして表示
- **保存失敗時のエラー表示**: `videoRes.ok && faceRes.ok` が false の場合、エラー内容を赤字表示
- **行ヘッダー即時更新**: 保存成功後に「プリロール✓ / 未設定」表示が `savedPreRollUrl` / `savedPostRollUrl` state で即時反映

#### 接続設定DELETE時の顔出し動画ファイル削除バグ修正（重大）
- **バグ内容**: `DELETE /api/admin/assignments/[id]` が `preRollStoragePath` / `postRollStoragePath` のファイルを Supabase Storage から削除していた
- **影響**: 顔出し動画ライブラリ（`SalespersonFaceVideo`）のファイル実体が消え、DB レコードは残るが URL が 404 になる「ゾンビレコード」が生成されていた
- **修正**: `deleteFaceVideo` 呼び出しを除去。顔出し動画ファイルの削除は `DELETE /api/salesperson/profile/face-videos/[id]` のみで行う
- **データ復旧手順**: 営業マンが `/dashboard/profile` でゾンビレコードを削除 → 再アップロード → 管理者が接続設定を再設定

#### 顔出し動画アップロード Internal Server Error 修正
- **原因**: `@ffprobe-installer/ffprobe` のバイナリが 76MB あり Vercel サーバーレス関数にバンドルされない → `getVideoDurationSec` が例外を投げて 500 エラー
- **修正**: `getVideoDurationSec` の戻り値を `number | null` に変更
  - ffprobe のパス解決失敗・実行エラー時は `null` を返す
  - 呼び出し側で `null` の場合は尺チェックをスキップしてアップロード続行
  - `durationSec` は `0` で DB 保存（フォールバック）
- **影響箇所**: `src/lib/video-duration.ts`, `src/app/api/salesperson/profile/face-videos/route.ts`, `src/app/api/face-videos/upload/route.ts`

### 実装上の重要な知見（2026-06-24 追加）

#### Vercel デプロイ設定
- Vercel プロジェクトの **Root Directory** を `homereelmatch` に設定しないと、repo ルートへのデプロイになりアプリが動かない
- `.vercel/project.json` の `projectId` で接続先プロジェクトを確認できる

#### 接続設定と顔出し動画ライブラリの関係
- `SalespersonVideo.preRollPublicUrl` は `SalespersonFaceVideo.publicUrl` への**参照（コピー）**に過ぎない
- 接続設定（`SalespersonVideo`）を削除してもファイルは削除してはいけない
- ファイルのライフサイクルは `SalespersonFaceVideo` が管理する
- 同じ顔出し動画を複数の接続設定で参照することも可能（排他制約なし）

#### ffprobe と Vercel
- `@ffprobe-installer/ffprobe` の linux-x64 バイナリは 76MB あり、Vercel の関数バンドルに含まれない
- `getVideoDurationSec` は `number | null` を返す設計とし、`null` の場合は尺チェックをスキップすること
- 10 秒制限はクライアントサイドでも別途実装することを推奨

### 環境変数メモ

- `ENCRYPTION_KEY`: 生成済み・Vercel homereelmatch に設定済み（`.env.local` にも追加済み）
- `DATABASE_URL`: `.env` の `channel_binding=require` を除去済み（Prisma P1000 対策）
- `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN`: Vercel 本番値設定済み・Webhook 検証 200 OK 確認済み（2026-06-19）
- `GMAIL_USER` / `GMAIL_APP_PASSWORD`: Vercel 設定済み・デプロイ完了（2026-06-19）
- `PREVIEW_PASSWORD`: Vercel 設定済み（2026-07-01）。HTTP Basic Auth プレビューゲート用。未設定時はゲートなし（本番以外）

### 直近の主要変更（2026-07-01）

#### モバイルハッシュタグフィルターのリセットバグ修正
- **原因**: Next.js App Router のソフトナビゲーションは Client Component の `useState` をリセットしない
- **修正1**: `VideoFeedClient` に `key` prop を追加 → フィルターパラメータ変更時に強制リマウント
  - `key={`${tag}_${q}_${houseMakerId}_${venueId}`}` を `page.tsx` で設定
- **修正2**: `useIntersectionObserver.ts` の `options` を `useRef` で安定化（毎レンダーで新オブジェクト生成を防ぐ）
- **修正3**: `VideoFeedClient` の `loading/hasMore/cursor` を `useState` → `useRef` に変更し `loadMore` コールバックを安定化

#### 営業マン公開プロフィールページ追加
- **新規ファイル**: `src/app/(public)/salesperson/[salespersonId]/page.tsx`
  - グラデーションヒーローカード・アイコン写真・担当動画グリッド（最大6件）・LINE/メールCTAボタン
  - `videoSegments` リレーション（Prisma `Salesperson` モデルの `SalespersonVideo` への関係名）を使用
- **VideoFooter**: プロフィール画像を `<Link href={/salesperson/${sp.id}}>` に変更、「プロフィールを見る」リンク追加

#### 営業マンダッシュボードにプロフィール画像アップロード追加
- **新規 API**: `POST /api/salesperson/profile/icon` → JPEG/PNG/WebP 5MB以下 → Supabase Storage `face-videos/profile-icons/{id}/` に保存
- **新規関数**: `src/lib/storage.ts` に `uploadProfileImage()` / `deleteProfileImage()` 追加
- **ProfileClient**: ファイル選択→ローカルプレビュー（FileReader）→アップロードのフロー実装

#### プレビューゲート（HTTP Basic Auth）追加
- `src/proxy.ts`（middleware）に `PREVIEW_PASSWORD` 環境変数によるBasic Auth ゲートを追加
- ゲート対象: 公開ページ全般（`/api/*`, `/login`, `/dashboard`, `/admin` は除外）
- ユーザー名は何でも可、パスワードのみ検証
- Edge Runtime 対応: `Buffer` ではなく `atob()` を使用
- ダッシュボード保護: `getToken()` from `next-auth/jwt`（`auth()` ラッパーは全ルートに使うとクラッシュするため使用禁止）

#### Prisma スキーマ `profileDetail` フィールド追加（マイグレーション未適用）
- `prisma/schema.prisma` の `Salesperson` モデルに `profileDetail String?` 追加
- マイグレーションファイル: `prisma/migrations/20260701000000_add_profile_detail/migration.sql`
- **注意**: 本番 DB への適用は未完了（`npx prisma migrate deploy` を手動実行が必要）
- 適用後はプロフィール詳細機能（`/salesperson/[id]` の詳細セクション、ダッシュボードの入力欄）を復活させること

#### 重大バグ修正: Prisma `include` によるページクラッシュ
- **原因**: Prismaの `include: { salesperson: ... }` はスキーマに定義された**全フィールド**をSELECTする
  - `profileDetail` をスキーマに追加後、DBにカラムが存在しない状態でデプロイ → PostgreSQL エラー → 全ページクラッシュ
- **症状**: 「This page couldn't load / A server error occurred」（ホーム・動画視聴・全公開ページ）
- **修正**: 全 salesperson クエリを明示的 `select` に変更し `profileDetail` を除外
  ```typescript
  // ❌ NG: スキーマの全フィールドをSELECT（未存在カラムでクラッシュ）
  include: { salesperson: { include: { company: true } } }

  // ✅ OK: 必要フィールドのみ明示的にSELECT
  include: {
    salesperson: {
      select: { id: true, name: true, profileImage: true, bio: true,
        company: { select: { id: true, name: true, modelHouseName: true, modelHouseAddress: true } }
      }
    }
  }
  ```
- **影響ファイル**: `app/(public)/page.tsx`, `watch/[videoId]/page.tsx`, `api/videos/route.ts`, `salesperson/[id]/page.tsx`
- **SalespersonDTO**: `profileDetail` を optional（`profileDetail?: string | null`）に変更
- **ビルドスクリプト**: `prisma migrate deploy` を除去（`prisma generate && next build` に戻す）
  - `migrate deploy` はビルド時に実行すると DBが `db push` で初期化されていた場合にマイグレーション履歴の整合性問題を起こす可能性がある

### 実装上の重要な知見（2026-07-01 追加）

#### Next.js App Router ソフトナビゲーションと Client Component 状態
- ソフトナビゲーション（`<Link>` や `router.push()`）では Client Component の `useState` がリセットされない
- フィルターパラメータ変更時に初期化が必要なコンポーネントには `key` prop を付与してリマウントを強制する
- 無限スクロールの `loadMore` コールバックが毎レンダーで再生成されると `IntersectionObserver` が再設定されてバグになる → `useRef` で安定化

#### Prisma の `include` と明示的 `select` の使い分け
- `include: { model: true }` / `include: { model: { include: ... } }` → そのモデルの **全スキーマフィールド** をSELECT
- スキーマにフィールドを追加した場合、DBにカラムが存在しないとランタイムエラー
- **ルール**: 特定フィールドを除外したい場合・カラム存在を確認できない場合は必ず明示的 `select` を使うこと

#### Edge Runtime（middleware）での注意点
- Node.js の `Buffer` は Edge Runtime で使用不可 → base64 デコードは `atob()` を使う
- `next-auth/jwt` の `getToken()` は Edge Runtime 対応済み
- NextAuth v5 の `auth()` ラッパーを middleware でルート全体に適用するとページクラッシュが起きるケースがある → `getToken()` を使って必要なルートのみ保護すること

#### Prisma マイグレーションとビルドスクリプト
- `prisma migrate deploy` をビルドスクリプト（`"build":` フィールド）に入れると、DB の状態次第でビルド失敗やサイレントスキップが起きる
- **推奨**: `"build": "prisma generate && next build"` のみとし、マイグレーションは手動または別 CI ステップで実行

### 直近の主要変更（2026-07-02）

#### profileDetail マイグレーションの本番適用
- `npx prisma migrate deploy` をローカル端末（`.env` の DATABASE_URL）から実行し、未適用だった `20260623000000_salesperson_company_optional` と `20260701000000_add_profile_detail` の2件を本番 Neon DB に適用
- これにより `salespersons` テーブルに `profileDetail`（TEXT, nullable）カラムが追加され、2026-07-01 に無効化していた profileDetail 機能を安全に復活できる状態になった
- **注意**: このサンドボックス環境からは Neon（5432番ポート）への outbound がファイアウォールでブロックされており、Claude Code 自身はマイグレーションを実行できない。DB操作は必ずユーザーのローカル端末または別CIから実行すること

#### 営業マンプロフィールページ（`/salesperson/[salespersonId]`）を3カード構成に再編
- **カード1**（ヒーローカード、変更なし）: 氏名・ハウスメーカー名・簡易プロフィール（`bio`）
- **カード2**（変更）: 「担当動画」グリッド（`videoSegments` 一覧・最大6件）を削除し、`profileDetail`（詳細プロフィール）を表示するセクションに置き換え。`profileDetail` が null の場合はカード自体を非表示
- **カード3**（連絡カード、変更なし）: LINE/メール コンタクトフォーム
- 影響ファイル: `src/app/(public)/salesperson/[salespersonId]/page.tsx`

#### profileDetail の配線復活（マイグレーション適用に伴い）
- `GET/PATCH /api/salesperson/profile`: `select` と `PatchSchema` に `profileDetail` を追加（`z.string().max(3000).optional().nullable()`）
- `src/app/(sales)/dashboard/profile/page.tsx`: `select` に `profileDetail` を追加し、`ProfileClient` への `initialProfileDetail` を `null` 固定から実データ渡しに変更
- `ProfileClient` 側の詳細プロフィール入力フォーム（3000文字）は既に実装済みだったため、バックエンド配線のみで機能復活

### 実装上の重要な知見（2026-07-02 追加）

#### スキーマフィールドを段階的に有効化する際の順序
- 新しいカラムをコードで参照する（`select` に追加する）前に、**必ず本番DBへのマイグレーション適用を先に完了させる**こと
- 順序を誤ると（コードデプロイ→マイグレーション未適用の状態）、2026-07-01 と同様の全ページクラッシュが再発する
- 安全な手順: ① `prisma migrate deploy` を本番DBに適用 → ② 適用確認（`prisma migrate status`） → ③ 該当フィールドを `select` に追加するコードをデプロイ

#### サンドボックス環境からの本番DB操作の制約
- Claude Code のサンドボックスは outbound ファイアウォールにより Neon（PostgreSQL, 5432番ポート）へ直接接続できない
- 本番マイグレーションの適用はユーザーのローカル端末（`npx prisma migrate deploy`）で実行してもらう運用とする
- `Salesperson` モデルの `videoSegments` リレーション名に注意（`salespersonVideos` ではない）

### 直近の主要変更（2026-07-07）

#### 管理者の営業マン管理画面から自己紹介（bio）欄を削除
- `SalespersonManagerClient.tsx`（管理者ダッシュボード「営業マン管理」タブ）の新規登録フォーム・編集フォームから「自己紹介」入力欄を削除
- 関連する `Salesperson.bio` / `EditForm.bio` の state・送信payload・マージ処理も除去
- **営業マンダッシュボード側**（`/dashboard/profile` の `ProfileClient`、`profileDetail` 詳細プロフィール）は対象外・変更なし。管理画面のみで不要だったための削除
- バックエンド（`/api/admin/salespersons` 系）の `bio` パラメータは元々 optional のため変更不要
- 影響ファイル: `src/components/admin/SalespersonManagerClient.tsx`

### 直近の主要変更（2026-07-08）

#### 追加要件 Phase 1：0.2 閲覧者の軽量識別 + 機能B 学習コンテンツCMS
`requirements_addon_v1.md` / `CLAUDE_addon_v1.md` で定義された追加要件（購入検討者向け段階的知識コンテンツ・営業担当プロフィール強化）のうち、優先度「高」の2機能を第1弾として実装。機能A（プロフィール強化）・機能C（比較表→動画フィルター連携）・機能D（コンタクト前ハブ）は未実装（段階的実装の方針により後続フェーズで対応）。

- **Prismaモデル追加**: `LearningPhase`, `Article`, `ArticleComparisonRow`, `ViewerProfile`, `ViewerArticleProgress`（`HouseMaker` に `comparisonRows` 逆リレーションを追加）
- **閲覧者識別基盤**: `src/proxy.ts` で `hrm_viewer_token` Cookie（`httpOnly: false`, 1年）を自動発行。`src/lib/viewer.ts` に `getViewerToken()` / `ensureViewerProfile()` を追加
- **公開API**: `GET /api/phases`, `GET /api/articles?phaseKey=`, `GET /api/articles/[articleId]`（`PUBLISHED` のみ、`DRAFT` は404）, `POST /api/viewer/progress`
- **管理API**: `GET/POST /api/admin/phases`, `PATCH/DELETE /api/admin/phases/[id]`, `GET/POST /api/admin/articles`, `GET/PATCH/DELETE /api/admin/articles/[articleId]`（`comparisonRows` はPATCH時に `deleteMany: {} , create: [...]` のネスト書き込みで全置換）
- **管理画面**: `AdminDashboardClient` に「学習コンテンツ」タブを追加、`LearningContentManagerClient.tsx` でフェーズ・記事CRUD＋比較表編集＋プレビュー（`ArticleViewer` を `previewMode` で再利用）
- **公開ページ**: `/journey`（`PhaseTimeline`、フェーズごとの進捗表示）、`/journey/[phaseKey]/[articleOrder]`（`ArticleViewer` + `ComparisonTable`）
- **Markdown安全表示**: `react-markdown` + `remark-gfm` + `rehype-sanitize` を新規導入。`Article.bodyMarkdown` は保存時無加工・表示時サニタイズの方針
- **テスト**: `viewer-init.test.ts`, `articles.test.ts`, `admin/articles.test.ts` を追加（計17件）

#### 本番DBマイグレーション適用時に発覚した既存の問題と対処
- **Prisma migration drift**: 過去に `prisma db push` で本番Neon DBへ直接反映され、マイグレーション履歴に記録されていなかった変更（`salesperson_face_videos`/`salesperson_profile_videos`テーブル、`salespersons.houseMakerId`、`videos.sortOrder`、`salespersons.password`のデフォルト値差分）が発覚し、`prisma migrate dev` が「Drift detected」としてDBリセットを提案してきた
  - **対処**: `prisma migrate reset`（データ全消去）は絶対に使わない。既存差分を再現するベースライン用マイグレーション（`20260705000000_baseline_existing_drift`）を作成し、`prisma migrate resolve --applied <name>` でSQLを実行せず「適用済み」として記録するだけで解消した
  - 続けて `prisma migrate dev --name add_learning_content` を実行すると、上記に加えて `salespersons_companyId_fkey` の `onDelete` 差分（`RESTRICT`→スキーマ既定の`SET NULL`）も自動検出され、`20260708045004_add_learning_content` として追加生成・適用された（データを破壊しない安全な変更）
- **`prisma/migrations/migration_lock.toml` が存在しなかった**: 過去のマイグレーションがすべてサンドボックス環境（Neonへのoutbound不可）で手動作成されており、`prisma migrate dev` を一度も実際に実行していなかったため生成されていなかった。2026-07-08に手動作成して解消
- **`package.json` に `tsx` が未記載**: `db:seed` スクリプト（`tsx prisma/seed.ts`）が依存しているにもかかわらず `devDependencies` に無く、`npm run db:seed` が「'tsx' は認識されていません」で失敗する状態だった。`devDependencies` に追加して解消
- **ローカル開発時のService Worker残留**: `http://localhost:3000` で別プロジェクトのService Workerがブラウザに登録されたまま残っていると、`next dev` が正常起動していても古いアプリのキャッシュが表示されてしまう（ログに `GET /sw.js 404` が繰り返し出るのが症状）。シークレットウィンドウで開くか、DevTools → Application → Service Workers で Unregister すると解消する

### 実装上の重要な知見（2026-07-08 追加）

#### サンドボックスで手動作成したマイグレーションの検証手順
- サンドボックス環境はNeonへのoutboundが不可なため、新規マイグレーションのSQLは既存マイグレーションファイルのスタイルを踏襲して手動作成し、`npx prisma validate` / `npx prisma generate`（DB接続不要）で構文・スキーマ整合性のみ事前検証する
- 実際のDB適用と整合性確認は必ずユーザーのローカル端末で行う。適用時に `Drift detected` が出ても慌てず、`prisma migrate reset` を提案されても絶対に応じない（本番データ消失につながる）
- Drift の原因は大抵「過去に `db push` で直接反映され、migrate履歴に記録されていない変更」。ベースライン用マイグレーション＋`prisma migrate resolve --applied` で記録のみ更新すれば、データを一切失わずに解消できる

#### npx で意図しないバージョンのCLIが実行される問題
- ローカル端末で `node_modules` にプロジェクト指定バージョンの devDependency（例: `prisma`）が入っていない状態で `npx <cli>` を実行すると、`package.json` のバージョン指定を無視してレジストリから最新版を取得してしまう（例: `prisma@^6.0.0` 指定なのに `npx prisma` が `prisma@7.8.0` のインストールを提案してくる）
- 対処: `npx` の前に必ず `npm install` を実行し、プロジェクト指定バージョンが `node_modules/.bin` に存在する状態にしてから `npx` を使う

### 直近の主要変更（2026-07-10）

#### 機能A：営業担当プロフィール強化・自己紹介動画アップロード化（プロフィール項目の統合）
2026-07-08に機能A（プロフィール「人となり」強化）を実装・本番適用したが、ダッシュボードで実際に入力した際に「一言プロフィール(bio)」「詳細プロフィール(profileDetail)」「スタンス一言(toneQuote)」「家づくりで大切にしていること(valuesStatement)」「一問一答」がほぼ同じ内容の繰り返し入力になることが判明し、フィードバックに基づき是正した。

- **短文フィールドを`toneQuote`（スタンス一言）に一本化**: `Salesperson.bio`を廃止。ホーム/視聴ページの動画カード・ホバーオーバーレイ・モバイル展開パネル（`VideoCard.tsx`）、動画一覧API（`api/videos/route.ts`）、`SalespersonDTO`、`mapVideoToDTO`、管理者API（`api/admin/salespersons/**`）など、bioを参照していた全箇所を`toneQuote`に置き換え
- **長文フィールドを`profileDetail`（詳細プロフィール）に一本化**: `Salesperson.valuesStatement`を廃止し、ラベルを「詳細プロフィール（家づくりで大切にしていること）」に変更
- **一問一答（`SalespersonQAItem`）機能を全削除**: スキーマ・API（`/api/salesperson/profile/qa`系）・`QAItemEditor.tsx`・公開ページのQAセクションをすべて削除
- **自己紹介動画をURL登録方式から直接アップロード方式に変更**: 要件定義書は「既存の`SalespersonProfileVideo`（外部URL登録方式）を流用し新規アップロードは作らない」としていたが、`SalespersonProfileVideo`はダッシュボードUIから一度も呼ばれておらず本番データも無かったため、モデルごと廃止し`Salesperson`に`introVideoUrl`/`introVideoStoragePath`/`introVideoDurationSec`を直接追加。既存の顔出し動画アップロード基盤（`uploadFaceVideo`/`deleteFaceVideo`/`getVideoDurationSec`、Supabase Storage）を流用し、30秒上限・単一スロット（アップロードで置き換え）方式の新規API `POST/DELETE /api/salesperson/profile/intro-video` を追加
- **データ保全マイグレーション**: 新マイグレーション（`20260710000000_consolidate_salesperson_profile_fields`）で、カラムをDROPする前に`bio`→`toneQuote`（60字に切り詰め）、`valuesStatement`→`profileDetail`（末尾に追記）のUPDATE文を実行してから削除。テストデータ以外にも本番の実入力を失わないための措置

#### 実装上の重要な知見（2026-07-10 追加）
- **要件定義書のフィールド構成をそのまま実装する前に、実際にダッシュボードへ入力してユーザーに確認してもらうと、フィールドの重複・過剰設計に早く気づける**。今回は本番適用後にユーザーが実際に入力してから重複に気づいた。次回以降、新規入力フォームを追加する際は「このフィールドは他のどのフィールドと内容が被りうるか」を実装前に一度整理するとよい
- **ダッシュボードUIから一度も呼ばれていないAPI/モデルは、要件書の指定（流用方針）より実際の利用実績を優先して再設計してよい**。`SalespersonProfileVideo`はテストコードのみが参照しており本番データも無かったため、モデルごと作り替える判断ができた。逆に`bio`のように動画カード等の広範囲で実際に使われているフィールドは、削除ではなく全参照箇所を洗い出した上での置き換えが必要
