# Mockup100 Print-on-Demand Customizer for WooCommerce

Official source repository for the free WordPress/WooCommerce plugin that binds
store products to Mockup100 templates, opens a standalone design workspace from
product pages, and writes the selected design payload into WooCommerce cart and
order items.

## Source Code And Build

This repository intentionally ships both the compiled assets and the
human-readable source code used to generate them.

- `assets/js/editor-app.js` and `assets/css/editor-app.css` are built from
  `src/editor/main.js` and `src/editor/styles.css`
- `assets/js/mockup100-editor.umd.js`,
  `assets/js/mockup100-editor.iife.js`, and
  `assets/css/mockup100-editor.css` are built from
  `src/wordpress-editor/pod-customizer/index.ts` via
  `vite.config.wordpress.ts`
- `assets/js/vue.global.js` is the vendored upstream Vue 3 global runtime from
  `node_modules/vue/dist/vue.global.prod.js`

For the full reproducibility checklist, see
`docs/BUILD.md`. WordPress.org reviewers and GPL recipients can rebuild the
custom-generated assets from the same source tree and build configuration that
ship in this repository and in the release package.

## Repository Layout

- `assets/`: shipped frontend assets loaded by the plugin
- `docs/`: build reproducibility and third-party attribution notes
- `includes/`: PHP plugin bootstrap, REST controller, settings, cart/order
  integration, and WooCommerce admin helpers
- `scripts/`: build, package, harness server, and focused PHP verification
  helpers
- `src/editor/`: legacy editable frontend source for `editor-app.*`
- `src/wordpress-editor/`: WordPress editor source tree used to generate the
  custom `mockup100-editor.*` bundles
- `woocommerce/`: template overrides used by the storefront integration

## Local Development

1. Install Node.js 18+ and npm.
2. Run `npm install`.
3. Run `npm run build` to regenerate the shipped `assets/js/*` and
   `assets/css/*` files.
4. Run `npm run build:wordpress` if you want to inspect the standalone UMD/IIFE
   outputs under `dist-wordpress/`.
5. Optional: run `npm run dev:harness` and open
   [http://127.0.0.1:4174/](http://127.0.0.1:4174/).

## Store Setup

1. Open `Mockup100 > Settings` in wp-admin.
2. Keep the platform URL as `https://www.mockup100.com`.
3. Paste the tenant API key generated in your Mockup100 account.
4. Edit a WooCommerce product and bind one or more templates.
5. Open the product page and click `Design`.
6. Prepare the design and add the configured product to cart.

## External Services

This free plugin communicates with the Mockup100 SaaS platform only when a shop
manager or shopper actively uses a Mockup100 feature such as template browse,
preview rendering, runtime asset retrieval, or cart/order snapshot handling.
Cloud sync and order-status callbacks remain opt-in and disabled by default
unless the site administrator explicitly enables them in Settings.

- Terms of Service: <https://www.mockup100.com/terms>
- Privacy Policy: <https://www.mockup100.com/privacy>

For the full plugin-directory disclosure text, see `readme.txt`.
