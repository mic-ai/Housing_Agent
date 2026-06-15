export interface EmbedVideo {
  id: string;
  platform: string;
  url: string;
  thumbnailUrl: string | null;
  title: string;
  hashtags: string[];
}

export interface WidgetOptions {
  container: HTMLElement;
  apiUrl: string;
  count?: number;
  tag?: string;
}

const WIDGET_STYLES = `
  :host {
    display: block;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .hrm-feed {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 8px 0;
    scrollbar-width: thin;
  }
  .hrm-card {
    flex: 0 0 160px;
    cursor: pointer;
    border-radius: 8px;
    overflow: hidden;
    background: #1a1a2e;
    text-decoration: none;
    color: inherit;
    display: block;
    transition: transform 0.2s;
  }
  .hrm-card:hover { transform: scale(1.03); }
  .hrm-thumb {
    width: 100%;
    aspect-ratio: 9/16;
    object-fit: cover;
    background: #0d0d1a;
    display: block;
  }
  .hrm-thumb-placeholder {
    width: 100%;
    aspect-ratio: 9/16;
    background: linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    font-size: 12px;
  }
  .hrm-info {
    padding: 8px;
  }
  .hrm-title {
    font-size: 11px;
    color: #e0e0e0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .hrm-error {
    padding: 16px;
    text-align: center;
    color: #888;
    font-size: 13px;
  }
`;

export class HomeReelMatchWidget {
  private options: WidgetOptions;
  private shadowRoot: ShadowRoot;

  constructor(options: WidgetOptions) {
    this.options = options;
    this.shadowRoot = options.container.attachShadow({ mode: "open" });
  }

  async render(): Promise<void> {
    const style = document.createElement("style");
    style.textContent = WIDGET_STYLES;
    this.shadowRoot.appendChild(style);

    try {
      const videos = await this.fetchVideos();
      const feed = this.buildFeed(videos);
      this.shadowRoot.appendChild(feed);
    } catch {
      const err = document.createElement("div");
      err.className = "hrm-error";
      err.textContent = "エラーが発生しました。しばらくしてから再度お試しください。";
      this.shadowRoot.appendChild(err);
    }
  }

  private async fetchVideos(): Promise<EmbedVideo[]> {
    const url = new URL(`${this.options.apiUrl}/api/embed/videos`);
    if (this.options.count) url.searchParams.set("count", String(this.options.count));
    if (this.options.tag) url.searchParams.set("tag", this.options.tag);

    const res = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { data: EmbedVideo[] };
    return data.data;
  }

  private buildFeed(videos: EmbedVideo[]): HTMLElement {
    const feed = document.createElement("div");
    feed.className = "hrm-feed";

    for (const video of videos) {
      const card = document.createElement("a");
      card.className = "hrm-card";
      card.setAttribute("data-video-id", video.id);
      card.href = `${this.options.apiUrl}/watch/${video.id}`;
      card.target = "_blank";
      card.rel = "noopener noreferrer";

      if (video.thumbnailUrl) {
        const img = document.createElement("img");
        img.className = "hrm-thumb";
        img.src = video.thumbnailUrl;
        img.alt = video.title;
        img.loading = "lazy";
        card.appendChild(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "hrm-thumb-placeholder";
        placeholder.textContent = video.platform;
        card.appendChild(placeholder);
      }

      const info = document.createElement("div");
      info.className = "hrm-info";
      const title = document.createElement("p");
      title.className = "hrm-title";
      title.textContent = video.title;
      info.appendChild(title);
      card.appendChild(info);

      feed.appendChild(card);
    }

    return feed;
  }
}

export function createWidget(options: WidgetOptions): HomeReelMatchWidget {
  return new HomeReelMatchWidget(options);
}

// Auto-init: <div data-homereelmatch data-api-url="..." data-count="5" data-tag="新築"></div>
function autoInit() {
  const elements = document.querySelectorAll<HTMLElement>("[data-homereelmatch]");
  elements.forEach((el) => {
    const apiUrl = el.dataset.apiUrl ?? "";
    const count = el.dataset.count ? parseInt(el.dataset.count, 10) : undefined;
    const tag = el.dataset.tag;
    const widget = createWidget({ container: el, apiUrl, count, tag });
    widget.render();
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
}
