import { test, expect } from "@playwright/test";

const SALESPERSON_ID = "sp_test_001";
const VIDEO_ID = "vid_test_001";
const CONTACT_REQUEST_ID = "cr_test_001";
const CONFIRMED_CONTACT_REQUEST_ID = "cr_test_002";

// ログイン用ヘルパー（ラベルに for 属性がないので type セレクターを使用）
async function loginAs(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
}

test.describe("コンタクト申請フロー", () => {
  test("P-01: ポータルホームに動画カードが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/HomeReelMatch/i);

    // 動画カードのリンクが存在する（シードデータの動画）
    const videoLinks = page.locator("a[href^='/watch/']");
    await expect(videoLinks.first()).toBeVisible({ timeout: 10_000 });
  });

  test("P-03: コンタクト申請フォームが表示される", async ({ page }) => {
    await page.goto(`/contact/${SALESPERSON_ID}`);

    // 営業マン名が表示される
    await expect(page.getByText("テスト営業太郎")).toBeVisible({ timeout: 10_000 });

    // 連絡方法のラジオボタンが表示される（label で input を囲む構造なので getByRole が機能する）
    await expect(page.getByRole("radio", { name: "LINE" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "メール" })).toBeVisible();

    // お名前フィールドが存在する（react-hook-form が name 属性を付与する）
    await expect(page.locator('input[name="name"]')).toBeVisible();

    // 送信ボタンが表示される
    await expect(page.getByRole("button", { name: "連絡を申請する" })).toBeVisible();
  });

  test("P-03: メール方法でコンタクト申請を送信すると予約ページへ遷移", async ({ page }) => {
    // フォーム送信の API をモック（Client Component の fetch はインターセプト可能）
    await page.route("/api/contact", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { id: CONTACT_REQUEST_ID, salespersonId: SALESPERSON_ID, status: "PENDING" },
        }),
      });
    });

    await page.goto(`/contact/${SALESPERSON_ID}?method=EMAIL`);
    await expect(page.getByText("テスト営業太郎")).toBeVisible({ timeout: 10_000 });

    // お名前入力
    await page.locator('input[name="name"]').fill("E2Eテストユーザー");

    // メール方法が既に選択されているか確認し、なければ選択
    const emailRadio = page.getByRole("radio", { name: "メール" });
    if (!(await emailRadio.isChecked())) {
      await emailRadio.click();
    }

    // メールアドレス入力（EMAIL 選択後に表示される）
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible({ timeout: 3_000 });
    await emailInput.fill("e2e@test.example.com");

    // 送信
    await page.getByRole("button", { name: "連絡を申請する" }).click();

    // 予約ページへリダイレクト
    await expect(page).toHaveURL(`/booking/${CONTACT_REQUEST_ID}`, { timeout: 10_000 });
  });

  test("P-02: 動画視聴ページが開き動画タイトルが表示される", async ({ page }) => {
    await page.goto(`/watch/${VIDEO_ID}`);

    // VideoFooter にタイトルが表示される
    await expect(page.getByText("おしゃれなリビングのある家")).toBeVisible({ timeout: 10_000 });

    // 動画コンテナ（aspect-ratio div）が存在する
    await expect(page.locator('[class*="aspect"]').or(page.locator('[class*="player"]')).first()).toBeVisible();
  });

  test("P-02: LINEで連絡ボタンからコンタクトページへ遷移できる", async ({ page }) => {
    await page.goto(`/watch/${VIDEO_ID}`);
    await expect(page.getByText("おしゃれなリビングのある家")).toBeVisible({ timeout: 10_000 });

    // VideoFooter の「LINEで連絡」リンクをクリック
    await page.getByText("LINEで連絡").click();

    await expect(page).toHaveURL(/\/contact\//, { timeout: 10_000 });
    await expect(page.getByText("テスト営業太郎")).toBeVisible({ timeout: 10_000 });
  });

  test("P-04: 面談予約ページが開き日時選択が表示される", async ({ page }) => {
    // シードデータの ContactRequest を使用
    await page.goto(`/booking/${CONTACT_REQUEST_ID}`);

    // ページタイトルと担当者情報が表示される
    await expect(page.getByRole("heading", { name: "面談予約" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("テスト営業太郎")).toBeVisible();

    // 日時選択エリアが表示される
    await expect(page.getByText("ご希望の日時を選択")).toBeVisible();
  });

  test("P-05: 予約完了ページが表示される", async ({ page }) => {
    await page.goto(`/booking/${CONFIRMED_CONTACT_REQUEST_ID}/complete`);

    // 完了見出しが表示される
    await expect(page.getByRole("heading", { name: "予約が確定しました" })).toBeVisible({ timeout: 10_000 });

    // 担当営業マン名が表示される
    await expect(page.getByText("テスト営業太郎")).toBeVisible();

    // 会社名が表示される
    await expect(page.getByText("テスト住宅株式会社")).toBeVisible();

    // ホームへ戻るリンクが表示される
    await expect(page.getByRole("link", { name: "ホームへ戻る" })).toBeVisible();
  });

  test("P-06: タグ検索結果ページが表示される", async ({ page }) => {
    // 新着タグの検索（Next.js が URL エンコードを処理する）
    await page.goto("/tag/%E6%96%B0%E7%9D%80");

    // ハッシュタグ名が h1 見出しに表示される
    await expect(page.getByRole("heading", { name: "#新着" })).toBeVisible({ timeout: 10_000 });

    // 動画カードが表示される
    const videoLinks = page.locator("a[href^='/watch/']");
    await expect(videoLinks.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("営業マンログインフロー", () => {
  test("S-01: ログインページが表示される", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("HomeReelMatch")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });

  test("S-01: 正しい資格情報でログインしてダッシュボードへ遷移", async ({ page }) => {
    await loginAs(page, "sales@test.example.com", "password123");

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByText("ダッシュボード")).toBeVisible();
  });

  test("S-01: 誤った資格情報ではログインに失敗してエラーが表示される", async ({ page }) => {
    await loginAs(page, "wrong@test.example.com", "wrongpassword");

    // ログインページに留まる
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    // エラーメッセージが表示される
    await expect(page.getByText(/正しくありません|失敗/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("管理者ロール制御", () => {
  test("未ログインで管理者ダッシュボードにアクセスするとログインへリダイレクト", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("SALESPERSON ロールは管理者ダッシュボードに入れず営業ダッシュボードへリダイレクト", async ({ page }) => {
    await loginAs(page, "sales@test.example.com", "password123");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // 管理者ページへアクセス → 営業マンダッシュボードへリダイレクト
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });
    await expect(page.url()).not.toContain("/admin");
  });

  test("ADMIN ロールは管理者ダッシュボードにアクセスできる", async ({ page }) => {
    await loginAs(page, "admin@test.example.com", "password123");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10_000 });
    await expect(page.getByText("管理者ダッシュボード")).toBeVisible();
  });
});
