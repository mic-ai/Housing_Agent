# CLAUDE.md 追記分 — 購入検討者向け学習コンテンツ & 営業担当プロフィール強化

> このファイルは既存の `CLAUDE.md` に**追記**して使うことを想定している。
> 実装前に、まず既存の `CLAUDE.md` 全体と `requirements_addon_v1.md` を読むこと。
> 既存の規約（TypeScript strict、Server Component優先、認証・認可、命名規則、禁止事項等）はすべてそのまま適用される。

---

## 追加機能の概要

1. **営業担当プロフィール「人となり」強化** — 一問一答・大切にしていること・経歴サマリーを追加
2. **段階的知識学習コンテンツ** — CMS管理の記事（①情報収集／②メーカー選定）を、閲覧ユーザーがフェーズ順に読む
3. **②→③ 比較表→動画フィルター連携** — 記事内の比較表から動画ポータルへフィルター付き遷移
4. **コンタクト前ハブ** — 閲覧済み営業マンの再訪・候補メーカーの未視聴担当の提示

**設計上、絶対に守ること：**
- マッチングアルゴリズム・スコアリング・レコメンド順位付けは実装しない。並び順は常に「新着順」「視聴日時順」等の機械的な基準のみとする
- 学習コンテンツ用の新規動画は制作しない。①②のフェーズは記事（Markdown）のみで構成する
- 既存の「動画視聴 → コンタクト」フロー（`VideoFooter`、`/contact/[salespersonId]`、`CompositePlayer` 等）には変更を加えない

---

## Prismaスキーマ追加

`prisma/schema.prisma` に以下を追加する。フィールド名は既存の camelCase 規約に従う。

```prisma
// --- 営業担当プロフィール強化 ---

model Salesperson {
  // ...既存フィールドは変更しない...
  valuesStatement  String?              // 家づくりで大切にしていること（300字目安）
  toneQuote        String?              // ヒーローカードのスタンス一言（60字目安）
  yearsExperience  Int?
  handoverCount    Int?
  qaItems          SalespersonQAItem[]
}

model SalespersonQAItem {
  id            String      @id @default(cuid())
  salespersonId String
  salesperson   Salesperson @relation(fields: [salespersonId], references: [id], onDelete: Cascade)
  question      String
  answerText    String
  answerVideoUrl String?
  sortOrder     Int         @default(0)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@map("salesperson_qa_items")
}

// --- 学習コンテンツ（CMS管理） ---

enum ArticleDifficulty {
  BEGINNER   // 入門
  BASIC      // 基礎
}

enum ArticleStatus {
  DRAFT
  PUBLISHED
}

model LearningPhase {
  id          String    @id @default(cuid())
  key         String    @unique   // "info_basic" | "maker_selection"
  title       String
  order       Int
  description String?
  isActive    Boolean   @default(true)
  articles    Article[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@map("learning_phases")
}

model Article {
  id                String            @id @default(cuid())
  phaseId           String
  phase             LearningPhase     @relation(fields: [phaseId], references: [id])
  order             Int
  title             String
  bodyMarkdown      String            @db.Text
  estimatedMinutes  Int
  difficulty        ArticleDifficulty
  translateBoxLabel String?
  translateBoxValue String?
  status            ArticleStatus     @default(DRAFT)
  publishedAt       DateTime?
  comparisonRows    ArticleComparisonRow[]
  progress          ViewerArticleProgress[]
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@index([phaseId, order])
  @@map("articles")
}

model ArticleComparisonRow {
  id            String      @id @default(cuid())
  articleId     String
  article       Article     @relation(fields: [articleId], references: [id], onDelete: Cascade)
  houseMakerId  String?
  houseMaker    HouseMaker? @relation(fields: [houseMakerId], references: [id])
  priceRangeTag String?     // 動画フィルター引き継ぎ用（既存Hashtagの値と一致させる運用）
  featureTag    String?     // 同上
  order         Int         @default(0)

  @@map("article_comparison_rows")
}

// --- 閲覧ユーザーの軽量識別・進捗管理 ---

model ViewerProfile {
  id               String                    @id @default(cuid())
  viewerToken      String                    @unique
  createdAt        DateTime                  @default(now())
  lastSeenAt       DateTime                  @updatedAt
  articleProgress  ViewerArticleProgress[]
  savedMakers      ViewerSavedMaker[]
  salespersonViews ViewerSalespersonView[]

  @@map("viewer_profiles")
}

model ViewerArticleProgress {
  id          String        @id @default(cuid())
  viewerId    String
  viewer      ViewerProfile @relation(fields: [viewerId], references: [id], onDelete: Cascade)
  articleId   String
  article     Article       @relation(fields: [articleId], references: [id], onDelete: Cascade)
  completedAt DateTime?

  @@unique([viewerId, articleId])
  @@map("viewer_article_progress")
}

model ViewerSavedMaker {
  id           String        @id @default(cuid())
  viewerId     String
  viewer       ViewerProfile @relation(fields: [viewerId], references: [id], onDelete: Cascade)
  houseMakerId String
  houseMaker   HouseMaker    @relation(fields: [houseMakerId], references: [id])
  createdAt    DateTime      @default(now())

  @@unique([viewerId, houseMakerId])
  @@map("viewer_saved_makers")
}

model ViewerSalespersonView {
  id            String        @id @default(cuid())
  viewerId      String
  viewer        ViewerProfile @relation(fields: [viewerId], references: [id], onDelete: Cascade)
  salespersonId String
  salesperson   Salesperson   @relation(fields: [salespersonId], references: [id])
  videoId       String?
  video         Video?        @relation(fields: [videoId], references: [id])
  viewCount     Int           @default(1)
  lastViewedAt  DateTime      @updatedAt

  @@unique([viewerId, salespersonId])
  @@map("viewer_salesperson_views")
}
```

**マイグレーション手順（既存の知見に従う）：**
1. ローカルで `npx prisma migrate dev --name add_learning_content_and_viewer_profile` を実行しマイグレーションファイルを生成
2. 本番適用は必ずユーザーのローカル端末から `npx prisma migrate deploy` を実行する（このサンドボックス環境から Neon への outbound は不可なため）
3. **既存の重大バグ（2026-07-01）と同じ轍を踏まないこと**：新フィールドをコードの `select` / `include` で参照するのは、本番マイグレーション適用の確認（`prisma migrate status`）が完了してから行う

---

## ディレクトリ構造の追加

```
homereelmatch/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── journey/
│   │   │   │   ├── page.tsx                          ← P-08 マイ家づくりハブ
│   │   │   │   └── [phaseKey]/[articleOrder]/page.tsx ← P-09 学習パス（記事ビューア）
│   │   │   └── consult/page.tsx                       ← P-10 担当に相談する
│   │   ├── (admin)/admin/dashboard/
│   │   │   └── page.tsx                               ← 既存。タブに「学習コンテンツ管理」を追加
│   │   └── api/
│   │       ├── viewer/
│   │       │   ├── init/route.ts                      ← POST viewerToken発行
│   │       │   ├── progress/route.ts                  ← GET/POST 記事既読
│   │       │   ├── saved-makers/route.ts               ← GET/POST
│   │       │   ├── saved-makers/[id]/route.ts           ← DELETE
│   │       │   ├── salesperson-views/route.ts          ← GET一覧 / POST視聴記録
│   │       │   └── candidate-salespeople/route.ts      ← GET（?houseMakerId=）
│   │       ├── phases/route.ts                         ← 公開: フェーズ一覧
│   │       ├── articles/
│   │       │   ├── route.ts                            ← 公開: 記事一覧（?phaseKey=）
│   │       │   └── [articleId]/route.ts                ← 公開: 記事詳細
│   │       ├── salesperson/profile/
│   │       │   └── qa/
│   │       │       ├── route.ts                        ← GET一覧 / POST追加
│   │       │       └── [id]/route.ts                   ← PATCH/DELETE
│   │       └── admin/
│   │           ├── phases/route.ts                     ← GET/POST
│   │           ├── phases/[id]/route.ts                ← PATCH/DELETE
│   │           ├── articles/route.ts                   ← GET/POST
│   │           └── articles/[articleId]/route.ts       ← GET/PATCH/DELETE
│   ├── components/
│   │   ├── journey/
│   │   │   ├── PhaseTimeline.tsx                       ← P-08 縦タイムライン
│   │   │   ├── ArticleViewer.tsx                       ← P-09 記事本文＋翻訳ボックス
│   │   │   └── ComparisonTable.tsx                     ← ②記事の比較表（タップでフィルター遷移）
│   │   ├── consult/
│   │   │   ├── ViewedSalespersonList.tsx                ← 閲覧済み営業マン一覧
│   │   │   └── CandidateSalespersonRow.tsx              ← 候補メーカーの未視聴担当
│   │   ├── sales/
│   │   │   └── QAItemEditor.tsx                         ← ダッシュボードの一問一答編集
│   │   └── admin/
│   │       └── LearningContentManagerClient.tsx         ← フェーズ・記事CRUD
│   └── lib/
│       └── viewer.ts                                    ← viewerToken の発行・Cookie読み書きヘルパー
```

---

## 実装規約（追加分）

### 閲覧ユーザーの識別（`src/lib/viewer.ts`）

- Cookie名: `hrm_viewer_token`（`httpOnly: false`, `maxAge: 60 * 60 * 24 * 365`）
- Server Component からは `cookies()` で読み取り、未発行の場合は該当ページで `POST /api/viewer/init` を呼ぶクライアント初期化コンポーネントを経由して発行する
- 既存の `User`（コンタクト申請者）とは**別モデル**として扱う。本要件では統合しない

### 記事本文のレンダリング

- `Article.bodyMarkdown` は保存時点ではサニタイズせず、**表示時にサニタイズ**する（`rehype-sanitize` 等、許可タグを見出し・段落・リスト・強調に限定するホワイトリスト方式を使用する）
- 生HTMLの直接保存・`dangerouslySetInnerHTML` への未サニタイズ投入は禁止

### 比較表→動画フィルター連携

- `ComparisonTable.tsx` の行タップは `router.push()` で `/?houseMakerId=xxx&tag=xxx` のようにクエリパラメータを付与する遷移とする
- `featureTag` / `priceRangeTag` は既存の `Hashtag.name` と**文字列一致**させる運用とする（CMS入力時に既存ハッシュタグ一覧からの選択式にし、自由入力による不一致を防ぐこと）

### CMS（学習コンテンツ管理）のアクセス制御

- `/admin/dashboard` の新タブ、および `api/admin/phases`, `api/admin/articles` 系エンドポイントは `requireAdmin()` を使用する（既存の `src/lib/admin.ts` のヘルパーをそのまま利用）
- 営業マン（`SALESPERSON`）はこれらのエンドポイントにアクセスできない

### 一問一答（`SalespersonQAItem`）

- 編集は営業マン本人（自分の `salespersonId` に紐づくレコードのみ）または `ADMIN` のみ許可する。既存の「所有権チェック → ADMINは除外」パターン（`src/lib/admin.ts`）に従う
- 最大10件までとし、`sortOrder` で並び替え可能にする（ドラッグ&ドロップは必須要件ではない。上下ボタンで可）

### DTO型定義

- 新規エンドポイントを追加したら、既存規約通り `src/types/index.ts` に以下の型を追加すること：
  `ArticleDTO`, `LearningPhaseDTO`, `ViewerProfileDTO`, `ViewerArticleProgressDTO`, `SalespersonQAItemDTO` 等

---

## テストへの追加

- `src/__tests__/api/` に以下を追加：
  - `viewer-init.test.ts` — Cookie未発行時の初期化フロー
  - `articles.test.ts` — 公開記事のみ返却されること（`DRAFT` は非表示）
  - `admin-articles.test.ts` — `requireAdmin()` によるアクセス制御
  - `comparison-table-filter.test.ts` — 比較表タップ時のクエリパラメータ生成ロジック
- E2E（`e2e/`）に `journey-flow.spec.ts` を追加し、①→②→③の一連の遷移（記事既読 → 比較表タップ → フィルター付き動画ポータル遷移）を検証する

---

## 禁止事項（追加分）

- 記事・営業担当の表示順序を決定するための「スコア計算」「重み付けロジック」を実装しないこと（既存の禁止事項「クライアントコンポーネントで直接DBアクセス禁止」等と同様、設計原則として扱う）
- `ViewerProfile` に氏名・連絡先等の個人情報を持たせないこと（匿名識別子に徹する。コンタクト申請時の個人情報は既存の `ContactRequest.questionnaireJson`（暗号化済み）で扱う）
- 学習コンテンツ関連の新規動画アップロード機構を作らないこと（一問一答の回答動画は既存の外部URL登録方式のみ）
