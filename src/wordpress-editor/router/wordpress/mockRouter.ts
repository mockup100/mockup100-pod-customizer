import { defineComponent, h, type PropType } from "vue"

export type NavigationGuardNext = (to?: boolean | RouteLocationRaw) => void
export type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => unknown

export interface RouteLocationNormalized {
  path: string
  name?: string | null
  params: Record<string, string>
  query: Record<string, string>
  hash: string
  fullPath: string
  matched: RouteLocationNormalized[]
  redirectedFrom?: string
  meta: Record<string, unknown>
}

export type RouteLocationNormalizedLoaded = RouteLocationNormalized
export type RouteLocationGeneric = RouteLocationNormalized
export type LocationQuery = Record<string, string | string[] | null | undefined>

export interface RouteRecordRaw {
  path: string
  name?: string | null
  props?: boolean | Record<string, unknown> | ((route: RouteLocationNormalized) => Record<string, unknown>)
  children?: RouteRecordRaw[]
  alias?: string | string[]
  beforeEnter?: NavigationGuard | NavigationGuard[]
  meta?: Record<string, unknown>
  redirect?: string | { name: string }
}

export interface RouteLocationRaw {
  path?: string
  name?: string | null
  params?: Record<string, string>
  query?: LocationQuery
  hash?: string
  replace?: boolean
  state?: Record<string, unknown>
  force?: boolean
}

export interface Router {
  push(to: RouteLocationRaw): Promise<unknown>
  replace(to: RouteLocationRaw): Promise<unknown>
  back(): void
  forward(): void
  go(delta: number): void
  beforeEach(guard: NavigationGuard): () => void
  afterEach(guard: NavigationGuard): void
  onError(handler: (err: unknown) => void): void
  isReady(): Promise<void>
  getRoutes(): RouteRecordRaw[]
  resolve(to: RouteLocationRaw): RouteLocationNormalized
  addRoute(parentName: string, route: RouteRecordRaw): void
  getMatchedRoutes(path: string): RouteRecordRaw[]
  removeRoute(name: string): void
  hasRoute(name: string): boolean
}

export interface WordPressRouteQuery {
  template_id?: string
  template?: string
  template_code?: string
  display_name?: string
  source?: string
  storefront_slug?: string
  store_slug?: string
  admin_view?: string
  artwork_id?: string
  artwork?: string
  tenant_id?: string
  product_id?: string
  variation_id?: string
  wc_nonce?: string
  return_url?: string
  [key: string]: string | undefined
}

let routeQuery: WordPressRouteQuery = {}
let routeState: RouteLocationNormalized | null = null

function createRoute(query: WordPressRouteQuery): RouteLocationNormalized {
  const qs = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&")

  return {
    path: "/preview",
    name: "wordpress-preview",
    params: {},
    query: query as Record<string, string>,
    hash: "",
    fullPath: `/preview${qs ? `?${qs}` : ""}`,
    matched: [],
    redirectedFrom: undefined,
    meta: {},
  }
}

export function setWordPressRouteQuery(query: WordPressRouteQuery) {
  routeQuery = { ...query }
  routeState = createRoute(routeQuery)
}

export function useRoute(): RouteLocationNormalized {
  if (!routeState) {
    setWordPressRouteQuery({})
  }
  return routeState as RouteLocationNormalized
}

export function useRouter(): Router {
  return {
    push: async () => Promise.resolve(),
    replace: async () => Promise.resolve(),
    back: () => {},
    forward: () => {},
    go: () => {},
    beforeEach: () => () => {},
    afterEach: () => {},
    onError: () => {},
    isReady: () => Promise.resolve(),
    getRoutes: () => [],
    resolve: () => useRoute(),
    addRoute: () => {},
    getMatchedRoutes: () => [],
    removeRoute: () => {},
    hasRoute: () => false,
  }
}

export function onBeforeRouteLeave(_guard: NavigationGuard): void {}

export function onBeforeRouteUpdate(_guard: NavigationGuard): void {}

export function createWebHistory() {
  return {
    base: "/preview",
  }
}

export function createRouter() {
  return useRouter()
}

export const RouterLink = defineComponent({
  name: "MockRouterLink",
  props: {
    to: {
      type: [String, Object] as PropType<string | RouteLocationRaw>,
      required: true,
    },
  },
  setup(props, { slots, attrs }) {
    return () => {
      const href =
        typeof props.to === "string"
          ? props.to
          : props.to.path || useRoute().fullPath
      return h(
        "a",
        {
          ...attrs,
          href,
        },
        slots.default ? slots.default() : []
      )
    }
  },
})

export const RouterView = defineComponent({
  name: "MockRouterView",
  setup(_, { slots }) {
    return () => (slots.default ? slots.default() : null)
  },
})
