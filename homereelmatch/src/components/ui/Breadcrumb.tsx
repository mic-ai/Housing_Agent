import Link from "next/link";
import { safeJsonLd } from "@/lib/utils";

export interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** アプリのベースURL。JSON-LDの絶対URLに使用 */
  appUrl: string;
}

export function Breadcrumb({ items, appUrl }: BreadcrumbProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: `${appUrl}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <nav aria-label="パンくずリスト" className="text-xs text-stone-400">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && <span aria-hidden="true" className="text-stone-600">›</span>}
              {item.href && index < items.length - 1 ? (
                <Link href={item.href} className="hover:text-amber-400 transition-colors">
                  {item.name}
                </Link>
              ) : (
                <span className="text-stone-300 truncate max-w-[200px]">{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
