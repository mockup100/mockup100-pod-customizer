import type { RouteLocationNormalizedLoaded } from "vue-router"

const SITE_NAME = "Mockup100"
const SITE_URL = "https://www.mockup100.com"
const DEFAULT_IMAGE = "https://oss.mockup100.com/showcase/website-landing.jpg"
const DEFAULT_TITLE = "Mockup100 | Production-Ready Mockups For Custom Products"
const DEFAULT_DESCRIPTION =
  "Mockup100 helps brands and stores launch custom products faster with production-ready mockups, developer access, and creative space plugins."

function normalizeSeoPath(path: string) {
  if (!path || path === "/") return "/"
  return path.replace(/\/+$/, "") || "/"
}

type SeoConfig = {
  title: string
  description: string
  keywords?: string
  robots?: string
  image?: string
  type?: string
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>
}

function buildAbsoluteUrl(path: string) {
  const normalizedPath = normalizeSeoPath(path)
  if (typeof window === "undefined") return `${SITE_URL}${normalizedPath}`
  const baseOrigin = window.location.origin.startsWith("http") ? window.location.origin : SITE_URL
  return new URL(normalizedPath, `${baseOrigin}/`).toString()
}

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  if (typeof document === "undefined") return
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement("meta")
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute("content", content)
}

function upsertCanonical(url: string) {
  if (typeof document === "undefined") return
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!element) {
    element = document.createElement("link")
    element.setAttribute("rel", "canonical")
    document.head.appendChild(element)
  }
  element.setAttribute("href", url)
}

function upsertStructuredData(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
  if (typeof document === "undefined") return
  const existing = document.head.querySelector<HTMLScriptElement>('script[data-seo-schema="route"]')
  const next = existing || document.createElement("script")
  next.type = "application/ld+json"
  next.dataset.seoSchema = "route"
  next.textContent = JSON.stringify(payload)
  if (!existing) document.head.appendChild(next)
}

function buildPageSchema(
  canonicalUrl: string,
  title: string,
  description: string,
  path: string,
): Record<string, unknown> {
  const pageType = path === "/" ? "WebPage" : "CollectionPage"
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": pageType,
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: title,
        description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}/`,
          },
          ...(path === "/"
            ? []
            : [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: title.replace(/\s+\|\s+Mockup100$/, ""),
                  item: canonicalUrl,
                },
              ]),
        ],
      },
    ],
  }
}

function resolvePublicSeo(path: string): SeoConfig {
  if (path === "/pricing") {
    return {
      title: "Mockup Rendering Pricing | Mockup100",
      description:
        "Start free and scale with flexible mockup rendering credits for custom products, ecommerce mockups, product personalization, WordPress, Shopify, and API workflows.",
      keywords:
        "mockup pricing, custom product mockup pricing, ecommerce mockup generator pricing, product personalization pricing, mockup api pricing, shopify mockup plugin, woocommerce mockup plugin",
      structuredData: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebPage",
            name: "Mockup Rendering Pricing | Mockup100",
            url: `${SITE_URL}/pricing`,
            description:
              "Flexible pricing for custom product mockups, ecommerce personalization, developer access, WordPress, and Shopify workflows.",
          },
          {
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Do tokens expire?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "No. Tokens never expire. You can start with 500 free tokens at signup and buy more only when you need additional mockups.",
                },
              },
              {
                "@type": "Question",
                name: "How are renders billed?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Billing is token-based. 512x512 is always free, 1024x1024 uses 1 token, 2048x2048 uses 2 tokens, and 4096x4096 uses 8 tokens. Custom non-standard sizes are rounded up to the nearest tier.",
                },
              },
              {
                "@type": "Question",
                name: "Can I use the same token wallet for API and store plugins?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. The same token wallet can be used across the workspace, developer access, WordPress, and Shopify workflows.",
                },
              },
            ],
          },
        ],
      },
    }
  }

  if (path === "/api") {
    return {
      title: "Developer Access For Mockup Automation | Mockup100",
      description:
        "Connect Mockup100 to your storefront or app with a custom product mockup API, product personalization workflow, render automation, and store plugins.",
      keywords:
        "mockup api, product personalization api, custom product api, ecommerce mockup api, mockup generator api, shopify mockup api, woocommerce mockup api",
      structuredData: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "SoftwareApplication",
            name: "Mockup100 Developer Access",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: `${SITE_URL}/api`,
            description:
              "Developer access for connecting Mockup100 rendering, customization, and output delivery to storefronts and product tools.",
          },
          {
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Can I keep the full customer experience on my own storefront?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Your storefront or app can keep its own brand, layout, checkout, and customer journey while Mockup100 handles template data, customization logic, rendering, and output delivery.",
                },
              },
              {
                "@type": "Question",
                name: "Do I need to call the API from my server?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. The x-api-key should stay on your backend. Your frontend should call your own server first, and your server should forward requests to Mockup100.",
                },
              },
              {
                "@type": "Question",
                name: "Can I use WordPress or Shopify instead of building everything myself?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. If you want a faster launch, Mockup100 provides WordPress/WooCommerce and Shopify paths so you can go live without building the full product customization experience from scratch.",
                },
              },
            ],
          },
        ],
      },
    }
  }

  return {
    title: DEFAULT_TITLE,
    description:
      "Create and deliver production-ready mockups for custom products, ecommerce personalization, and creative space workflows with Mockup100.",
    keywords:
      "custom product mockups, ecommerce mockup generator, product personalization software, mockup automation, mockup api, mockup plugins",
  }
}

function resolveSeoConfig(route: RouteLocationNormalizedLoaded, fallbackTitle: string): SeoConfig {
  const normalizedPath = normalizeSeoPath(route.path)
  if (normalizedPath === "/" || normalizedPath === "/pricing" || normalizedPath === "/api") {
    return resolvePublicSeo(normalizedPath)
  }

  if (normalizedPath === "/auth" || normalizedPath.startsWith("/admin") || normalizedPath.startsWith("/verify-email")) {
    return {
      title: fallbackTitle,
      description: DEFAULT_DESCRIPTION,
      robots: "noindex,nofollow",
    }
  }

  return {
    title: fallbackTitle,
    description: DEFAULT_DESCRIPTION,
    robots: normalizedPath === "/preview" ? "noindex,nofollow" : "index,follow",
  }
}

export function applyRouteSeo(route: RouteLocationNormalizedLoaded, fallbackTitle: string) {
  if (typeof document === "undefined") return
  const normalizedPath = normalizeSeoPath(route.path)
  const config = resolveSeoConfig(route, fallbackTitle)
  const canonicalUrl = buildAbsoluteUrl(normalizedPath)
  const title = config.title || fallbackTitle || DEFAULT_TITLE
  const description = config.description || DEFAULT_DESCRIPTION
  const keywords = config.keywords || "custom product mockups, ecommerce mockup generator, mockup automation"
  const robots = config.robots || "index,follow"
  const image = config.image || DEFAULT_IMAGE
  const type = config.type || "website"

  document.title = title
  upsertCanonical(canonicalUrl)
  upsertMeta("name", "description", description)
  upsertMeta("name", "keywords", keywords)
  upsertMeta("name", "robots", robots)
  upsertMeta("property", "og:site_name", SITE_NAME)
  upsertMeta("property", "og:type", type)
  upsertMeta("property", "og:title", title)
  upsertMeta("property", "og:description", description)
  upsertMeta("property", "og:url", canonicalUrl)
  upsertMeta("property", "og:image", image)
  upsertMeta("name", "twitter:card", "summary_large_image")
  upsertMeta("name", "twitter:title", title)
  upsertMeta("name", "twitter:description", description)
  upsertMeta("name", "twitter:image", image)

  const schema = config.structuredData || buildPageSchema(canonicalUrl, title, description, normalizedPath)
  upsertStructuredData(schema)
}
