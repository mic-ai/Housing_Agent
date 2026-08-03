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
| 追加要件 機能C（②→③ 比較表→動画フィルター連携） | 完了（2026-07-10、スキーマ変更なし） |
| 追加要件 機能D（コンタクト前ハブ `/consult`） | 完了（2026-07-11、本番DBマイグレーション適用済み） |
| 公開ページ共通の下部ナビゲーション（ホーム/学習/相談タブ） | 完了（2026-07-11、要件定義書スコープ外・ユーザーフィードバックで追加） |
| 本番全断バグ修正（コミットのpush漏れによる新DB×旧コードのミスマッチ） | 完了（2026-07-12） |
| 学習ジャーニー可視化のUX刷新（ロードマップ表示・リング進捗バッジ・祝福オーバーレイ） | 完了（2026-07-12、要件定義書スコープ外・ユーザーフィードバックで追加） |
| セキュリティ監査・脆弱性修正（IDOR・XSS・LINE署名検証・PII暗号化fail-closed・Basic Auth定数時間比較・アップロードMagic Byte検証） | 完了（2026-07-15、本番push・デプロイ済み） |
| 顔出し動画不具合の原因切り分け（Supabaseプロジェクト自動pause） | 完了（2026-07-27、ユーザーがResumeボタンで復旧） |
| 学習ジャーニーナビゲーション統合・UX調整（下部タブ廃止→常時ロードマップ化→コンパクト化） | 完了（2026-07-27、要件定義書スコープ外・ユーザーフィードバックで3段階反復） |
| 学習フェーズ名を新規追加時6文字以内に制限 | 完了（2026-07-27、既存フェーズタイトルの編集UIは無いため既存データは対象外） |
| 学習ジャーニーページ（`/journey`配下）のダークモード視認性バグ修正 | 完了（2026-07-27） |
| 公開ページのローディング画面追加・DB往復回数削減（パフォーマンス改善） | 完了（2026-07-27、サブエージェント調査） |
| 中立的AIエージェント構想 Step1（QRコード動線・受付タブレット連携・来場者トラッキング） | 完了（2026-07-31、`/tdd`でTDD実装・本番DBマイグレーション適用済み） |
| 中立的AIエージェント構想 Step2（来場前デジタル導線：予約完了/確認メール/リマインドに自己紹介動画リンク） | 完了（2026-07-31、Vercel Cron新設・本番マイグレーション適用済み） |
| 中立的AIエージェント構想 Step3（来場者データ集計ダッシュボード） | 完了（2026-07-31、本番マイグレーション適用済み・2026-08-03に`prisma migrate status`で確認） |
| 学習コンテンツ記事のWeb下書き自動生成機能（管理者向け、Claude web_search） | 完了（2026-08-03、本番push・Vercel環境変数`ANTHROPIC_API_KEY`設定・本番DBマイグレーション適用済み） |

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

### 直近の主要変更（2026-07-10 その2）

#### 機能C：②→③ 比較表からの動画フィルター連携
学習コンテンツ（機能B）の②メーカー選定フェーズ記事にある「ざっくり比較表」から、既存の動画ポータルへフィルター付きで遷移できるようにした。Prismaスキーマ変更・マイグレーションは不要（既存の`ArticleComparisonRow`をそのまま使用）。

- **`ComparisonTable.tsx`をタップ遷移対応に変更**（`"use client"`化）: 行タップで`houseMaker`→`houseMakerId`、`featureTag`→`tag`をクエリパラメータとして`/`へ`router.push`。`priceRangeTag`は要件定義書3.1節の指定通り「新規フィルター軸はスコープ外」のため遷移には使わず表示のみ
- **`interactive` prop追加**: 管理画面のプレビュー（`ArticleViewer`の`previewMode`）では比較表タップが実際のページ遷移を起こさないよう`interactive={!previewMode}`を配線
- **管理画面の比較表編集（`LearningContentManagerClient.tsx`）**: `featureTag`をPhase 1では自由入力にしていたが、`GET /api/hashtags`から取得した既存ハッシュタグ一覧のプルダウンに変更し、動画側のタグと文字列不一致が起きないようにした
- **`HashtagCloud.tsx`の個別解除対応**: 従来`tag`をクリアする際`href="/"`で全条件をリセットしていたが、`houseMakerId`/`venueId`/`salespersonId`を保持したまま`tag`だけ差し替え/削除できるよう修正（`FilterBar.tsx`の`navigate()`と同じ考え方）
- **比較表UIの見直し（ユーザーフィードバック反映）**: 当初`<table>`＋各セルに素のテキスト表示だったが、①ハッシュタグ選択肢に付けていた`#`装飾がプルダウン上で不要と指摘されたため削除、②「価格帯ごとにグループ化して見やすく」という要望を受け、`<table>`から価格帯（`priceRangeTag`）で連続行をグルーピングする見出し付きリスト形式に作り替えた（`groupByPriceRange`ヘルパー、`src/components/journey/ComparisonTable.tsx`）。「性能×価格帯の4象限マトリクス」という案も出たが、性能を表すデータが現行スキーマに無いため今回は見送り、価格帯グルーピングという軽量な案を採用した

#### 実装上の重要な知見（2026-07-10 その2 追加）
- **UIの見やすさ改善要望が来たとき、それが表示ロジックだけで完結するか、新しいデータ軸（スキーマ変更）を要求しているかを見極めてから着手する**。「性能×価格帯の4象限」案は「性能」という未定義の新データ軸を要求しており、既存データのみで実現できる「価格帯グルーピング」案とは実装コストが大きく異なった。AskUserQuestionで選択肢を提示し、スコープを確定させてから実装した
- **管理画面での動作確認中に出る`P1001: Can't reach database server`は、直前のコード変更のバグと決めつけず、まずネットワーク接続の問題を疑う**。Neon（サーバーレスPostgres）は非アクティブ時にスリープすることがあり、一時的な到達不能エラーは再試行で解消するケースがある

### 直近の主要変更（2026-07-11）

#### 機能D：コンタクト前ハブ（`/consult`）
要件定義書4章に従い、閲覧ユーザーがこれまで見た営業担当・気になるメーカーの他の担当を整理して提示する`/consult`ページを追加。マッチング・推薦ロジックは実装せず、並び順は`lastViewedAt`/`createdAt`降順のみ。

- **Prismaモデル追加**: `ViewerSalespersonView`（`viewerId`+`salespersonId`一意）、`ViewerSavedMaker`（`viewerId`+`houseMakerId`一意）。逆リレーションを`Salesperson`/`Video`/`HouseMaker`/`ViewerProfile`に追加
- **視聴記録は既存フローを変更せず追加**: `WatchOverlay.tsx`が元々`POST /api/videos/[videoId]/view`をマウント時にfire-and-forgetしていたのと全く同じパターンで、`salespersonId` propが渡された場合に`POST /api/viewer/salesperson-views`も追加で発火するようにした。`CompositePlayer`/`VideoFooter`/コンタクトフロー（`/contact/[salespersonId]`）は無変更
- **API**: `GET/POST /api/viewer/salesperson-views`、`GET/POST /api/viewer/saved-makers`、`DELETE /api/viewer/saved-makers/[id]`（Cookie由来の`viewerId`一致による匿名所有権チェック、不一致は404）
- **`ViewerSavedMaker`の保存ボタンUIは今回も追加しない**（Phase 1時点でユーザーが「APIのみ実装」を選択済みの方針を継続）
- `/consult`は`/journey`と同様、他画面からのリンクを追加しない独立ページとして実装（後述の下部ナビゲーション追加により、結果的に導線が確保された）

#### 公開ページ共通の下部ナビゲーション追加（要件定義書スコープ外）
機能D完了後のユーザーフィードバックで「動画ポータル・学習ページ・相談ページ間の遷移が分かりにくい」との指摘があり、下部固定タブバー（ホーム/学習/相談）を追加した。

- **`src/app/(public)/layout.tsx`を新規作成**（従来は存在せず、ルートの`src/app/layout.tsx`のみが全ルートグループに適用されていた）。Next.jsのルートグループごとのlayout仕様により、`(sales)`/`(admin)`ダッシュボードには一切影響しない
- **`src/components/layout/PublicChrome.tsx`**（クライアントコンポーネント）: `usePathname()`で`/watch/`配下かどうかを判定し、動画視聴ページ（フル画面UI）ではタブバーを非表示・下部余白も付与しない。それ以外の公開ページでは下部にタブバー分の余白（`pb-16`）を確保して常時表示

#### 実装上の重要な知見（2026-07-11 追加）
- **既存の「fire-and-forgetでマウント時にPOSTする」パターン（`WatchOverlay`の視聴回数カウント）は、同種の新規トラッキング処理を追加する際の最小侵襲な差し込み口になる**。既存コンポーネントの構造・意図を変えずpropを1つ足すだけで、既存フロー無変更という制約を守りながら新機能のデータ収集ができた
- **Next.js App Routerでは、特定のルートグループにだけ共通UI（ナビ等）を追加したい場合、そのルートグループ直下に`layout.tsx`を新設すれば他のルートグループ（別の`(group)`）に影響しない**。ルート直下の`layout.tsx`を編集するより安全で、影響範囲を明確に絞り込める
- **フル画面UI（`/watch`の縦動画プレーヤー等）に共通クロームを追加する際は、対象パスを`usePathname()`で判定して個別に除外するクライアントラッパーが必要**。Server Componentのlayoutだけでは「特定の子ルートだけ親のUIを持たない」という制御ができないため、pathname判定を行うクライアントコンポーネントに処理を委譲する

### 直近の主要変更（2026-07-12）

#### 本番全断バグ修正：コミットのpush漏れ（重大インシデント）
本番ホーム(`/`)が`P2022: The column salespersons.bio does not exist`で全断。ユーザーから「他端末で閲覧できない」と報告を受けて調査した結果、コードのバグではなく運用ミスと判明。

- **根本原因**: ローカル`main`が`origin/main`より4コミット進んでいた（`git status -sb`で`ahead 4`）にもかかわらず一度もpushされておらず、Vercel（GitHub連携で自動デプロイ）は最も古いコミットのまま本番稼働し続けていた。一方DBは後続コミットのマイグレーション（`bio`カラム削除等）まで適用済みだったため、「新DB×旧コード」のミスマッチでクラッシュしていた
- **切り分け手順**: ユーザーにVercelダッシュボードのRuntime Logsを確認してもらい、`P2022`エラーの実際のスタックトレースを取得 → Deploymentsタブの最新コミットハッシュとローカルの`git log`を突き合わせ → `git status -sb`で未push分を確認、という順で特定した
- **対処**: `git push origin main`のみで解消（コード変更は不要）
- この調査の過程で判明した副次的な事実: `PREVIEW_PASSWORD`によるHTTP Basic Authゲートは、LINE/Instagramのアプリ内ブラウザやEdgeなど一部ブラウザで認証ダイアログ自体が正しく機能しない場合がある。ユーザーは「本番からは削除したい」との結論には至らず、**Basic Auth自体は現状維持**を選択（Cookie方式への切り替え等の代替案は保留）

#### 学習ジャーニー可視化のUX刷新（3段階の反復）
ユーザーから「計画時の学習段階の可視化が全ページに表示されていない」という指摘を受け、閲覧者が今①〜④のどの段階にいるかを全公開ページで分かりやすく示す機能を追加。要件定義書のスコープ外（ユーザーフィードバック起点）。3段階で反復した。

1. **初期実装**: `JourneyStepper`（4つの丸番号が常時全ページに横並び表示）。ユーザーが実際に見て「シームレスに情報獲得できるUIではない」と評価
2. **再構築1（方向性B、コミット`78702f0`）**: Planエージェントに現状の情報設計を俯瞰させ、3方向性を提示・選定してもらった上で実装
   - `JourneyNudge`: ホーム(`/`)と`/consult`のみに表示する1行の圧縮ナッジ（現在地ラベル＋タップで展開）。他ページ（`/journey`・`/salesperson/[id]`・`/tag/[tagName]`等）からは常時表示のチェーンを撤去
   - `FirstRunJourneyCard`: 進捗ゼロの閲覧者のみホームに表示する「はじめての方へ」招待カード（Cookieで再表示抑制）
   - フェーズ最後の記事読了時・初めて営業担当付き動画を視聴した瞬間にピルトースト表示
   - ユーザー検証の結果、「進捗ありユーザーがホームを見返す」シナリオでは見た目の差分が「4つの丸→1行のテキスト」程度で地味との評価
3. **再構築2（方向性B+A、コミット`4998f3c`）**: 再度Planエージェントに「もっと劇的な改善」を諮問し、3方向性から選定
   - `JourneyPathMap`（新規）: ①②③④を絵文字アイコンの駅に見立て、破線の道でつなぐ横並びロードマップ表示。通過済みはアンバー塗り、現在地はパルスアニメーション。`/journey`ハブページと、ナッジの展開表示の両方で共用
   - `JourneyRingBadge`（新規）: SVGの円環プログレスバッジ（インスタストーリー風）。ホーム/相談の常時ナッジのアイコンに採用
   - `CelebrationOverlay`（新規）: 画面暗転＋カードがバウンドしながらポップイン＋CSSのみの紙吹雪演出のモーダル。「続ける→」「あとで」のユーザー操作待ちで、従来のピルトーストのような自動遷移はしない。フェーズ完了時（アンバー系）と初回営業担当動画視聴時（エメラルド系）に使用
   - 旧`JourneyStepper.tsx`・`PhaseTimeline.tsx`は完全に置き換えられたため削除
- **`src/lib/journey.ts`の`getJourneyOverview()`**: React `cache()`でリクエスト内メモ化した単一の関数が、①②（CMS学習フェーズの既読数）③（`ViewerSalespersonView`の有無）④（③到達後は恒常的に現在地）の4段階と、`hasAnyProgress`・`progressFraction`（リング用の0〜1進捗率）をまとめて返す。`layout.tsx`・`/journey`ページ・ナッジ・ロードマップ表示すべてがこの1つの関数を共有

#### 実装上の重要な知見（2026-07-12 追加）
- **本番障害調査の鉄則**: 「DBマイグレーション後にクラッシュしたように見える」報告は、コードのバグを疑う前にまず`git status -sb`で`origin/main`とのahead/behindを確認し、Vercel DeploymentsタブでProductionの最新コミットハッシュと突き合わせる。今回もVercel Runtime Logsの`P2022`エラー文言から特定できた
- **React `cache()`によるリクエスト内メモ化**: 同一リクエスト内で`layout.tsx`と個別の`page.tsx`が同じ非同期関数（例: `getJourneyOverview()`）を呼び出しても、`cache()`でラップしておけばDB問い合わせは1回に重複排除される。Next.js App Routerでlayoutとpageにまたがるデータを二重取得せずに共有する標準パターン
- **UI改善が「地味に見える」というフィードバックは、変更が状況依存（初回ユーザーのみ・完了の瞬間だけ等）で静止画1枚には映らないタイミングで起きやすい**。見た目の議論をする前に、ユーザーがどの環境（本番かローカルか）・どのCookie状態（進捗あり/なし）で検証しているかを先に確認するとすれ違いを防げる
- **「もっとドラマチックなUI改善を」という抽象的な要望を受けたときは、Planエージェントに複数方向性とASCIIモックアップを出させてAskUserQuestionのプレビュー機能で選んでもらう**、という往復が今回2回とも機能した。多め機能追加ではなく既存コンポーネントの視覚的な作り直し（アイコン・アニメーション・進捗の魅せ方）が主戦場になるため、テキストだけの提案より簡易モックアップがあると意思決定が速い

### 直近の主要変更（2026-07-15）

#### セキュリティ監査・脆弱性修正
汎用エージェントによる読み取り専用のセキュリティ監査（認証・認可・暗号化・CORS・アップロード検証・秘密情報管理を対象）を実施し、検出した8件（HIGH 2件・MEDIUM 3件・LOW 4件）すべてに対応した。コミット`e82172a`で本番push・デプロイ済み。

- **[HIGH] IDOR — 動画API(`/api/videos`, `/api/videos/[videoId]`)にオーナーシップ・ロールチェックがなかった**: `POST`は`requireSalesperson()`（セッション有無のみ）で任意の営業マンが動画登録できてしまい、CLAUDE.md記載の「動画登録はADMINのみ」という運用ポリシーがAPIレベルでは未実装だった。`requireAdmin()`に変更。`PATCH`/`DELETE`は`requireOwnedVideo()`ヘルパーを新設し、ADMINはバイパス、SALESPERSONは`SalespersonVideo`に割り当てが存在する場合のみ許可（`contact/[contactRequestId]/route.ts`等の既存パターンを踏襲）
- **[HIGH] JSON-LD経由のStored XSS**: `watch/[videoId]/page.tsx`・`Breadcrumb.tsx`・`app/layout.tsx`が`JSON.stringify()`の結果を`dangerouslySetInnerHTML`で`<script type="application/ld+json">`に埋め込んでおり、`JSON.stringify`は`<`をエスケープしないため動画タイトル等に`</script><script>...`を仕込まれるとタグを閉じられてしまう。上記IDORと組み合わさると任意の営業マンが公開ページにXSSを仕込める経路だった。`src/lib/utils.ts`に`safeJsonLd()`（`<`→`<`エスケープ）を追加し3箇所を置き換え
- **[MEDIUM] LINE Webhook署名検証がテスト済み実装とは別の重複実装だった**: `api/line/webhook/route.ts`が独自の`verifySignature()`を持ち、`LINE_CHANNEL_SECRET`未設定時に空文字列キーでHMAC計算してしまう（フォージ可能）バグがあった。`lib/line.ts`の`validateLineSignature()`（未設定なら`false`を返しfail-closed）に統一し、`crypto.timingSafeEqual`で比較するよう変更
- **[MEDIUM] `ENCRYPTION_KEY`未設定時、本番でもPIIを平文保存していた**: `encrypt.ts`の`encryptJson()`が警告ログのみで処理続行していたのを、`NODE_ENV === "production"`では例外を投げてfail-closedに変更（呼び出し元の`POST /api/contact`は既存try/catchで500を返す）
- **[LOW] Basic Authプレビューゲートのパスワード比較が非定数時間**: Edge Runtimeは`crypto.timingSafeEqual`が使えないため、`TextEncoder`でバイト列化しXORを早期returnなしで積算する自前の`timingSafeEqualString()`を実装
- **[LOW] `/admin`がmiddlewareの`getToken()`認証ガード対象外だった**: `/dashboard`のみが対象で、`/admin`は各ページの`auth()`呼び出しのみに依存していた（現状は事故なしだが新規`/admin/*`ルート追加時に無防備になるリスク）。ガード対象に`/admin`を追加（defense-in-depth。ロールチェック自体は引き続き各ページ側）
- **[LOW] 通知メール（LINE通知は対象外、Resend/Gmail経由のHTMLメールのみ）でユーザー入力が未エスケープ**: `lib/email.ts`に`escapeHtml()`を追加し、`userName`/`videoTitle`/`salespersonName`/`companyName`等をエスケープ
- **[LOW] アップロードファイルがクライアント申告の`File.type`のみで検証されマジックバイト未検証**: 新規`src/lib/file-sniff.ts`（`looksLikeAllowedVideo()`= mp4/movのftyp box・webmのEBMLヘッダ、`looksLikeAllowedImage()`= JPEG/PNG/WebPシグネチャ）を追加し、顔出し動画・自己紹介動画・プロフィール画像の全アップロードルート（`salesperson/profile/face-videos`, `intro-video`, `icon`, 管理者用`face-videos/upload`）に配線

#### 実装上の重要な知見（2026-07-15 追加）
- **セキュリティ監査で見つかったAPIの挙動変更（IDOR修正等）は、既存テストが「修正前の脆弱な挙動」を正として書かれていることがある**。今回`src/__tests__/api/videos/auth.test.ts`は「SALESPERSONが任意の動画を作成・更新できる（201/200が返る）」ことをテストしており、修正後は意図的にテストごと書き換えが必要だった。修正対象のAPIが実際にどのフロントエンドから呼ばれているか（`grep`でコンポーネントからの呼び出し元を確認）を先に洗い出すと、意図された権限モデルを取り違えずに直せる
- **アップロード系エンドポイントにマジックバイト検証を追加すると、既存テストの`new File(["x"], ...)`のようなダミーコンテンツが軒並み拒否されるようになる**。ISO container（mp4/mov）は`bytes[4:8] === "ftyp"`、WebMは`bytes[0:4] === 1A 45 DF A3`という最小限のシグネチャで足りるため、テスト側は本物のバイナリでなく12バイト程度の最小マジックバイト定数を用意すれば十分
- **Edge Runtime（`src/proxy.ts`）ではNode.jsの`crypto`モジュール（`timingSafeEqual`含む）が使えない**。定数時間比較が必要な場合は`TextEncoder`でバイト化しXORを早期returnなしで積算する自前実装が必要（`atob()`を使う既存のBase64デコード回避策と同じ制約）
- **このプロジェクトはVercelのGitHub連携による自動デプロイのため、「デプロイ」の実体は`git push origin main`である**。過去の本番全断インシデント（2026-07-12）と同じ理屈で、コミットだけでは本番に反映されない。また本サンドボックスからは`vercel` CLI（`npx vercel ls`等）がoutbound制限でタイムアウトし、デプロイ状況の直接確認はできないため、push後の動作確認はユーザーに依頼する運用とする

### 直近の主要変更（2026-07-27）

#### 顔出し動画不具合の原因切り分け（Supabaseプロジェクト自動pause）
営業マンの顔出し動画が`/watch`ページ・管理画面「公開設定」タブの両方で読み込みエラーになる不具合を調査。ブラウザConsoleの`net::ERR_NAME_NOT_RESOLVED`（DNS解決失敗）を手がかりに、保存されているSupabase Storage URLのホスト名を特定 → そのホスト名が`.env.local`のローカル開発設定と完全一致（環境変数の食い違いではない）→ 管理画面の「公開設定」プレビューでも同じURLが同じエラーになる（`/watch`固有のコードバグでもない）という消去法で、Supabaseプロジェクト自体がFreeプランの自動pause状態にあると特定。ユーザーがSupabaseダッシュボードから「Resume project」を実行して復旧。コード変更は無し。

- **本サンドボックスはNeon（5432番ポート）・Supabase（443番ポート）ともにoutboundがファイアウォールでブロックされているため、これらへの疎通確認は一切できない**。原因切り分けは全てユーザーに実ブラウザのDevTools（Network/Console）・管理画面プレビュー・Supabase/Vercelダッシュボードの値を確認してもらうリレー形式で進めた
- **`net::ERR_NAME_NOT_RESOLVED`はDNS解決失敗、すなわち「ファイルが無い/権限が無い」ではなく「そのドメイン自体が存在しない」ことを意味する**。Supabase無料プランはAPIアクセスが一定期間無いと自動pauseし、Storageのサブドメインが実質的に到達不能になる。同種のエラーを見たら、まずプロジェクトのpause状態を疑うとよい
- **Vercelの「Sensitive」環境変数は一度保存すると値を再表示できない**（上書きのみ可能）。環境変数の現在値を突き合わせたい場面では、Vercel側を諦めてDB/Storageに実際に保存されている値（今回は管理画面のプレビューリンク）を直接確認する方が早いことがある

#### 学習ジャーニーナビゲーション統合・UX調整（3段階反復）
「上部の情報獲得の流れ」と「下部のホーム/学習/相談タブ」が同じ遷移先を指し機能重複しているというユーザー指摘を起点に、3段階でナビゲーションを1つに集約した。

1. **1段階目（コミット`1a3f577`）**: 下部固定タブバー（`BottomNav`）を廃止し、上部の`JourneyNudge`（折りたたみ式）にホーム/学習/相談タブを移設 → ユーザー確認により「展開時のロードマップ（①②🎥💬）と遷移先が重複している」と再指摘
2. **2段階目（コミット`a5ffde3`）**: 追加したタブ側を削除し、`JourneyPathMap`（ロードマップ）を折りたたみ無しで常時表示に変更。`JourneyPathMap`に`usePathname()`ベースの現在地判定（`/`→🎥、`/consult`→💬、`/journey/{phaseKey}/...`→該当フェーズ）を追加し、進捗ステータス（済/現在/未着手の色分け）とは独立した「今見ているもの」のリング強調表示を実装。折りたたみ専用だった`JourneyRingBadge`・`progressFraction`は不要になり削除
3. **3段階目（コミット`cea078e`）**: 「表示面積が大きい」「GUIを工夫してほしい」というフィードバックを受け、アイコンを44px→28pxに縮小、「今ここ」テキストラベルとリング枠を廃止し、**現在見ているステーション以外を`opacity-40 grayscale`でグレーアウトする**方式に変更（進捗ではなく現在地の視認性をコントラストで担保）。下部の「ここまで来ました」案内文も削除

- **UI差し戻しの過程で「常時表示にすると自由に他のコンテンツへ辿り着けない」「進捗ではなく現在地をハイライトしてほしい」という2つの異なる要求が段階的に出てきた**。1回の実装で全部を満たそうとせず、都度のフィードバックに対して最小差分で応答したことで、無駄な手戻りなく収束できた
- **「グレーアウトで強調」は「リング枠やラベルで強調」より表示面積を増やさずにコントラストを作れる**。表示領域の制約が厳しいコンパクトUIで「今ここ」を示したい場合、対象を目立たせる（加算）より対象以外を沈める（減算）方が省スペースになりやすい

#### 学習フェーズ名を新規追加時6文字以内に制限
コンパクト化したロードマップ表示で長いフェーズ名が表示崩れの原因になるため、`api/admin/phases/route.ts`・`api/admin/phases/[id]/route.ts`のZodバリデーション（`title`）を`max(100)`→`max(6)`に変更し、`LearningContentManagerClient.tsx`のフェーズ追加フォームにも`maxLength={6}`を追加。

- **管理画面にはフェーズ追加フォームしか無く、既存フェーズのタイトルを後から編集するUIが現状存在しない**ことが調査で判明。そのため6文字制限は新規追加時のみに効き、既存の「① 情報収集の基礎」（9文字超）等は対象外のまま残る
- **本番DBのコンテンツ（`LearningPhase.title`等のCMSデータ）はseed.tsを直しても反映されない**。`seed.ts`の`upsert`は`update: {}`（既存レコードは何もしない）のため、再シードしても本番の既存タイトルは変わらない。本番コンテンツの文言変更は必ず管理画面の編集UI経由で行う必要がある

#### 学習ジャーニーページのダークモード視認性バグ修正
`/journey`と`/journey/[phaseKey]/[articleOrder]`の2ページだけ、他の公開ページ（ホーム・相談等）と違い`<main>`に明示的な`bg-*`指定が無いことが判明。`globals.css`の`@media (prefers-color-scheme: dark)`でOSダークモード時に`body`の背景がCSS変数経由で黒くなる一方、本文は`text-stone-900`等ライトモード専用の濃色文字が固定指定されており、黒背景×黒文字で読めなくなっていた。両ページの`<main>`に`min-h-screen bg-amber-50`を追加し、他の公開ページと同じ明示的ライト背景に統一して解消（コミット`c7c83e0`）。

- **このアプリはダークモード非対応（ライトオンリーのstone/amber基調デザイン）が方針だが、`globals.css`のCSS変数はOSのダークモード設定に反応する**ままになっていた。ページごとに明示的な`bg-*`を指定していれば問題は表面化しないが、1箇所でも指定漏れがあると`body`のテーマ反応型の背景が透けて見える。新規公開ページを追加する際は必ず`<main>`等のルート要素に明示的な背景色を指定すること

#### 公開ページのローディング画面追加・DB往復回数削減（パフォーマンス改善）
「画面の切り替えに時間がかかる」というフィードバックを受け、(1) Next.jsの`loading.tsx`規約でスピナー付き待機画面を`src/app/(public)/loading.tsx`・`journey/loading.tsx`に追加（コミット`d2ca7f3`）、(2) 汎用サブエージェントに公開ページのDB往復回数を調査させ、見つかった6箇所の無駄なラウンドトリップを解消（コミット`b4c3725`）。

- `getJourneyOverview()`と記事ページ（`journey/[phaseKey]/[articleOrder]/page.tsx`）が同一形状の`learningPhase.findMany`を別々に発行していたため、`getActivePhasesWithArticles()`という`cache()`ラップの共有ヘルパーに切り出し
- `/consult`: 閲覧履歴（`viewerSalespersonView`）と保存済みメーカー（`viewerSavedMaker`）の取得が互いに独立しているのに直列実行されていたのを`Promise.all`で並列化
- `/salesperson/[id]`・`/watch/[videoId]`: `generateMetadata`とページ本体が同一レコードを別々に`findUnique`していたのを`cache()`で共有フェッチャーに統合
- `/tag/[tagName]`: `include: { salesperson: { include: { company: true } } }`がSalespersonの全フィールド（passwordハッシュ等含む）まで取得していたのを、ホームページと同じ明示的`select`に絞り込み

- **バックグラウンドサブエージェントがAPI接続エラーで処理途中に停止した場合、`SendMessage`で同じagentIdに再開を指示すれば worktree 上の途中状態から続行できる**。今回は`/consult`ページの編集途中で停止したが、再開後に完了まで到達した
- **エージェントの成果はagentId名義のgit worktreeに残るが、worktree側の`node_modules`が壊れている（`@types`欠落・`.bin`シンボリックリンク未生成）ことがある**。この場合はworktreeでtsc/vitestを直接流そうとせず、`git diff`をパッチとして書き出し、動作確認済みのメイン作業ツリーに`git apply`してから検証する方が確実

### 直近の主要変更（2026-07-31）

`neutral_housing_agent_requirements.md`（中立的住宅購入AIエージェント構想。層1＝新規AIエージェント本体、層2＝HomeReelMatch拡張のStep1〜4）が新たに追加され、ドキュメントの推奨実装順（Step1→2→3→4→層1）に従い、`everything-claude-code`プラグインの`/tdd`コマンドを導入してTDD（RED→GREEN、Explore/Planサブエージェントによる事前調査→AskUserQuestionでのスコープ確認→実装）でStep1〜3まで実装した。

#### Step1: 展示場内の物理接点実装（QRコード動線・受付タブレット連携・来場者トラッキング）
- **Prismaモデル追加**: `Visitor`（匿名、実名/メール/LINE ID非保持、`consentGiven`/`lineOptIn`/`viewerId`）、`VisitorHouseMakerInterest`、`VisitorHashtagInterest`、`VisitorVideoView`（`visitorId`はnullable、`viewerId`は必須、`source`文字列でQR流入元を記録）、`VisitorContact`（Step3で配線）
- **QRトラッキング**: `SourceViewTracker`（fire-and-forget、`WatchOverlay.tsx`と同じパターン）を`/`・`/watch/[videoId]`に配置し`POST /api/visitor-video-views`で記録。QR4種（入口/ブース/設備前/出口）はすべて既存ページへの`?source=`付きディープリンクで実現し、新規ランディングページは作らなかった
- **受付タブレット（`/reception`、意図的に認証なし）**: 同意→メーカー/工法選択→結果（動画グリッド＋LINEオプトイン＋scan-to-link QR）の3ステップ。`qrcode`パッケージを新規導入
- **scan-to-link機構**: 受付でチェックインした`Visitor`と、来場者本人のスマホでの後続QRスキャンを紐付けるため、`GET /api/visitor/link/[visitorId]`で一度だけ表示するQRを経由して`hrm_viewer_token`（既存）と`hrm_visitor_id`（新規、1日）cookieを紐付ける。scan-to-linkされなかった場合、`VisitorVideoView.visitorId`はnullのままだが`viewerId`/`source`は記録され続けるため集計自体は失われない（許容している既知の制約）

#### Step2: 来場前デジタル導線
- 予約完了画面（`/booking/[contactRequestId]/complete`）・確認メール（`sendBookingConfirmationToUser`）・LINE通知（`notifyUserBookingConfirmed`）に営業マン自己紹介動画（`Salesperson.introVideoUrl`）へのリンクを追加（`source=pre_booking`）
- `/salesperson/[salespersonId]`に`source`パラメータを追加し、広告ランディング（`pre_ad`）も同じ既存ページで兼用
- **新規Vercel Cron**（`vercel.json`の`crons`、`0 0 * * *`=JST朝9時）: `GET /api/cron/booking-reminders`が当日予約者にリマインド送信（`source=pre_reminder`）。`CRON_SECRET`環境変数によるBearer認証、`Appointment.reminderSentAt`で二重送信防止、JST日付境界はサーバーのタイムゾーンに依存しないよう`Date.UTC()`ベースで計算

#### Step3: 来場者データ集計ダッシュボード
- ドキュメントは「Step1・2のデータ蓄積後、1〜2ヶ月の運用を経て構築」を推奨していたが、ユーザー判断で「コード実装は先行、数値の解釈判断（メーカー間優劣等）はデータが溜まってから」の方針で今回着手
- 調査の結果、要件定義書のKPI4種のうち2種（視聴→コンタクト転換率・フォロー後再エンゲージメント率）が当初は計算不可能と判明。前者は`POST /api/contact`に`VisitorContact`作成配線を追加（`hrm_visitor_id`cookieのみ使用、新規PII取得なし）して解消。後者は来場後フォロー機能自体が未実装のため「未計測」固定表示とした
- 来場者属性別（年代・検討住宅種別）の集計軸と初回/再来場判定は、フィールド自体が存在しない・匿名設計上正確な判定が不可能なためユーザー判断でスコープ外とした
- `src/lib/analytics.ts`（`$queryRaw`不使用、Prismaの`findMany`/`count`結果をアプリ側でJS集計）と管理画面「来場者データ」タブ（新規チャートライブラリ導入せず既存の数値タイル/テーブルスタイルを踏襲）を追加

#### 来場後3項目（アンケート・LINE定期配信・メールフォロー）は保留
`Visitor`が実名/メール/LINE IDを一切持たない匿名設計（Step1で意図的にそう設計）のため、来場後の外向きフォロー（LINE配信・メール送付）は技術的に届け先が無い。実装するには個人情報取扱い方針の変更と法務確認が前提になるため、ユーザー判断で今回は対象外とした。

### 実装上の重要な知見（2026-07-31 追加）

#### `/plugin`によるサードパーティCLAUDE Codeプラグイン導入
- `worldflowai/everything-claude-code`（`affaan-m/everything-claude-code`のフォーク）を`/plugin marketplace add` → `/plugin install`で導入し、`/tdd`コマンド（`tdd-guide`エージェント相当の指示文をロードするスキル）でTDD実装を進めた
- `/plugin`はビルトインCLIコマンドであり、Claude Code自身が代行実行することはできない。ユーザーに入力欄で直接`/plugin ...`と入力してもらう必要がある
- プラグインのREADMEには「MCPを一度に全部有効にしない（コンテキストウィンドウが70kまで縮む可能性）」「1プロジェクトあたり10個未満に抑える」という注意書きがある

#### サンドボックスとユーザーのWindows環境が同一ファイルシステムを共有している
- `D:\claude-test\Housing_Agent`はサンドボックス側`/d/claude-test/Housing_Agent`と**同一の実体**であることが判明した（新規作成直後のフォルダが見えないケースはあったが、既存の`Housing_Agent`配下は双方から同時に読み書きできるライブ共有）。そのため、こちらのサンドボックスでの`npm install`とユーザーのWindows端末での`npm install`が同じ`node_modules`を取り合い、互いのプラットフォーム別ネイティブバイナリ（`@rolldown/binding-linux-x64-gnu` vs `binding-win32-x64-msvc`等）を壊し合う
  - **Why:** `qrcode`追加時にサンドボックス側`npm install`が`ENOTEMPTY`/`EIO`で頻繁に失敗し、直後にユーザー側Windowsで`npm install`した後もサンドボックス側の`vitest`が`Cannot find module '@rolldown/binding-linux-x64-gnu'`で起動不能になる、を何度か繰り返した
  - **How to apply:** サンドボックスで`npm install`系が失敗したら`find node_modules -maxdepth 2 -name ".*-*" -type d -exec rm -rf {} +`（中断済みインストールの一時ディレクトリ）を削除してから再実行する。**`--omit=optional`は絶対に使わない**（現在のプラットフォームに必須のネイティブバイナリまで除外され、双方の環境を壊す）。また`yarn.lock`は都度無関係な依存バージョン差分でdiffが入るため、コミット前に`git diff --stat yarn.lock`で確認し、意図しない差分なら`git checkout -- yarn.lock`で戻してからコミットする

#### QRコード（scan-to-link含む）のローカル動作確認はlocalhostでは不可
- 受付タブレット（PC）とスマホが別デバイスの場合、`npm run dev`の既定の`localhost:3000`でアクセスしていると、生成されるQRのURLも`http://localhost:3000/...`になりスマホから到達不能になる
  - **How to apply:** PCのLAN内IPアドレス（`ipconfig`で確認）で`http://<LAN-IP>:3000/...`としてアクセスする必要がある。Windowsファイアウォールでプライベートネットワークからのアクセス許可も必要

#### Vercel Cronの導入
- `vercel.json`に`crons`を追加しても、Vercelダッシュボードの「Cron Jobs」ページに反映されるのはデプロイ後（`git push`→ビルド成功後）。反映前は「Get Started」のオンボーディング画面が表示され続ける
- Cron Jobsページの実際の日本語UI項目名（2026-07時点）: 左サイドバー「設定」→「Cron Jobs」。実行ログは「ログ」タブでパスをフィルタして確認する
- HobbyプランのCronは「UTC基準」「実行時刻に最大1時間の揺らぎ」がある。当日分をまとめて処理する設計（今回の`booking-reminders`）であれば実行時刻の揺らぎは結果に影響しない

#### 大規模requirements文書は「まず1ステップだけ」を毎回確認してから着手する
- `neutral_housing_agent_requirements.md`はStep1〜4＋AIエージェント本体まで書かれた大規模文書だったが、都度「今回はどこまでを対象にするか」「ドキュメントが推奨する前提条件（データ蓄積期間・法務確認等）を無視して良いか」をAskUserQuestionで確認してから各Stepに着手した
  - **Why:** Step3はドキュメント自身が「1〜2ヶ月の運用後に構築」を推奨しており、来場後3項目は個人情報取扱い方針の変更が前提だった。事前確認なしに一括実装すると、方針判断が必要な箇所を無断で決めてしまうリスクがあった
  - **How to apply:** 複数ステップからなる要件書を渡されたら、各ステップの前提条件・依存関係をまず洗い出し、ステップごとにスコープと前提の妥当性をユーザーに確認してから実装する
- **`generateMetadata`とpage本体が同一エンティティを別々に`findUnique`するのはNext.js App Routerでありがちな重複クエリパターン**。React`cache()`でラップした共有フェッチャー関数に切り出せば、Next.js自身のfetchデデュープ機構が使えないPrismaクエリでも1リクエスト内で1回に統合できる

### 直近の主要変更（2026-08-03）

#### 学習コンテンツ記事のWeb下書き自動生成機能
バックグラウンドサブエージェントのworktree（`.claude/worktrees/gleaming-twirling-rabbit`）に未コミットのまま残っていた実装を発見し、mainに統合してpush・本番デプロイまで完了した。管理画面「学習コンテンツ」タブの各フェーズに「Web下書き生成」ボタンを追加し、トピックを入力すると`@anthropic-ai/sdk`のweb_searchツールでClaudeが国土交通省・消費者庁等の公的機関サイトを優先して情報収集し、中立的な記事下書き（`status: DRAFT`）を自動生成する。

- **新規**: `src/lib/web-screening.ts`（`generateArticleDraft()`）、`POST /api/admin/articles/generate-draft`（`requireAdmin()`必須）
- **新規Prismaモデル**: `ArticleSource`（`Article`に`sources`リレーション追加）。生成時に参照したURLを透明性確保のため保存し、管理画面プレビューと公開記事ページ（`/journey/...`）の両方に出典リンクとして表示
- 生成された記事は必ず`DRAFT`で作成され、自動公開はしない。管理者が内容を確認・編集してから手動で公開する運用
- マイグレーション: `20260803000000_add_article_sources`（`article_sources`テーブル追加のみの安全な追加的変更）

#### worktree統合時に発覚した問題と対処
- **テストのモック実装がアロー関数で`new`不可能だった**: `vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn().mockImplementation(() => ({...})) }))`は、`new Anthropic()`のようにコンストラクタとして呼び出すと`TypeError: ... is not a constructor`になる。`mockImplementation(function () { return {...}; })`のように通常のfunction宣言に変更して解消
- **`@anthropic-ai/sdk`のバージョン指定`^0.70.0`が古く、実装が使う`web_search_20260209`ツール識別子の型が存在せず`tsc`が失敗**: `npm view @anthropic-ai/sdk versions --json`で最新版を確認し、`npm pack @anthropic-ai/sdk@0.115.0`でtarballを展開して型定義に`web_search_20260209`が含まれることを確認した上で`^0.115.0`に更新して解消
- **`ANTHROPIC_API_KEY`が`.env.local.example`に未記載**だったため追記（ただし`.env.local.example`自体は`.gitignore`の`.env*`パターンでリポジトリ管理外のため、この追記はローカルの参照用のみでコミット対象にはならない）
- **`yarn.lock`ノイズが今回も再発**: `npm install`のたびに1000行超の無関係な差分が入る既知の問題（2026-07-31の知見参照）が本セッションでも2回発生し、いずれも`git checkout -- yarn.lock`で破棄してからコミット・pushした

### 実装上の重要な知見（2026-08-03 追加）

#### サブエージェントworktreeの成果物は、mainだけを見ていると存在に気づけない
ユーザーから「スクリーニングの件」と過去の話題を尋ねられた際、mainブランチのコード・コミット履歴・CLAUDE.md・project memoryのいずれにも該当する記述が無く、一見「記憶が無い＝該当作業が存在しない」ように見えた。しかし`.claude/worktrees/`配下を検索したところ、独立したgit worktree（別ブランチ）に実装済み・未コミットのまま放置された機能が見つかった。
- **Why:** バックグラウンドサブエージェント（Task/Agent経由）はデフォルトで独立したworktreeに変更を書き込む。エージェントの作業が完了してもユーザー・メイン会話側が明示的に「取り込む」操作（diff適用またはマージ＋コミット）をしない限り、その成果はmainからは一切見えず、`git log`にも现れない
- **How to apply:** 過去に依頼したはずの作業について「どうなっているか」と聞かれ、mainやCLAUDE.md・記憶のどこにも記録が無い場合は、結論を急がずまず`find . -path '*/.claude/worktrees/*' -newer <基準ファイル>`や`grep -r <キーワード> .claude/worktrees/`で未統合のworktreeを探す。見つかった場合はブランチの内容・テスト状態を確認した上でユーザーに報告し、取り込むかどうかの判断を仰ぐ

#### 依存パッケージが提供する新しいAPI機能の型定義バージョンずれ
`package.json`に固定されたパッケージバージョンが古く、実装コードが使うAPI機能（今回は新しいツール識別子文字列）の型がSDKに存在しない、というケースが発生した。`npm view <pkg> versions --json`で利用可能なバージョン一覧を確認し、`npm pack <pkg>@<version>`でtarballを展開すれば、実際にインストールせずとも型定義ファイル（`.d.ts`）の中身をgrepで確認できる。目的のシンボルが含まれるバージョンを特定してから`package.json`を更新するのが、当てずっぽうにバージョンを上げるより確実
