=== Mockup100 Print-on-Demand Customizer for WooCommerce ===
Contributors: mockup100
Tags: print on demand, pod, product designer, mockup generator, woocommerce
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 0.5.8
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A Print-on-Demand designer for WooCommerce; bind products to Mockup100 templates and let customers personalize them in a live workspace.

== Description ==

Mockup100 Print-on-Demand Customizer for WooCommerce is a Print-on-Demand (POD) toolkit that connects your WooCommerce store to the Mockup100 platform. After you bind one or more design templates to a WooCommerce product, shoppers can launch a standalone designer page from the product detail page, customize artwork and text, generate a real-time mockup preview, and add the configured product to the cart.

The plugin proxies the Mockup100 external API through WordPress REST routes, so no design data is exposed directly to the browser, and all template/job/output metadata is written to the cart and order items for fulfillment.

= Key Features =

* Add a dedicated `Mockup100` admin menu for tenant API key settings.
* Bind multiple enabled templates to WooCommerce products and variations.
* Filter templates by category and keyword inside the WooCommerce product editor.
* Launch a standalone design page directly from the product detail page.
* Browse platform or tenant artwork, unlock paid artwork, and insert licensed artwork into the canvas.
* Upload artwork, add text, duplicate layers, lock layers, hide layers, and drag to reorder.
* Edit rich text properties including letter spacing, line height, stroke, background, opacity, and alignment.
* Show variation pricing, prepare the design, and add the configured product to cart.
* Write template / job / output metadata to cart and order line items for fulfillment.

= Requirements =

This plugin is an extension of WooCommerce. Please ensure that **WooCommerce 6.0+** is installed and activated before using this plugin.

== Source Code & Build (Vue Editor Bundle) ==

Public source repository (GPLv2+):

* GitHub: https://github.com/mockup100/mockup100-pod-customizer
* Mirror (primary CI): https://cnb.cool/befash-2025/3dreal/mockup-SAAS (path `repos/mockup-saas-wordpress-plugin/`)

All custom-generated frontend assets shipped in this plugin have matching, human-readable source files and build configuration in this same repository and release package:

1. `assets/js/editor-app.js` and `assets/css/editor-app.css` are built from `./src/editor/main.js` and `./src/editor/styles.css`.
2. `assets/js/mockup100-editor.umd.js`, `assets/js/mockup100-editor.iife.js`, and `assets/css/mockup100-editor.css` are built from `./src/wordpress-editor/pod-customizer/index.ts` via `./vite.config.wordpress.ts`.
3. `assets/js/vue.global.js` is the upstream vendored Vue 3 global runtime, copied from `node_modules/vue/dist/vue.global.prod.js`.

To rebuild the editor bundle locally:

1. Install Node.js 18+ and npm.
2. From the plugin root run `npm install` (only required once).
3. Run `npm run build` to regenerate the shipped `assets/js/*` and `assets/css/*` files.
4. Run `npm run build:wordpress` if you want to inspect the standalone WordPress bundle output under `dist-wordpress/`.

The release zip produced by `bash scripts/package-plugin.sh` ships the compiled output, the `./src/` source tree, `package.json`, `package-lock.json`, `vite.config.wordpress.ts`, and `scripts/build-frontend.mjs` so that WordPress.org reviewers can rebuild the custom-generated assets from the same package they review. See `docs/BUILD.md` for the full reproducibility checklist and `docs/THIRD-PARTY-NOTICES.md` for vendored library attribution (Vue 3, fabric.js).

== External Services ==

This plugin communicates with the Mockup100 SaaS platform to render print-on-demand previews, manage artwork licenses, and prepare cart / order snapshots. No data leaves the site until an authorised admin enters a tenant API key under `Mockup100 > Settings`.

* **Service provider:** Mockup100 (operator of the Mockup100 platform).
* **Endpoints called:**
    * `https://www.mockup100.com/api/v1/external/...` — template metadata, artwork browse / license, runtime job submission, runtime asset retrieval.
    * `https://oss.mockup100.com/...` and `https://mockup100.oss-*.aliyuncs.com/...` — Aliyun OSS storage for runtime preview / render output and cart / order snapshots; only domain + path-prefix-whitelisted URLs are proxied through `/wp-json/mockup100/v1/.../runtime-asset`.
* **Data sent:** tenant API key (server-to-server only), the customer-supplied design payload (template id, layer text / colors, uploaded artwork file, selected variation), and the resulting preview / render URLs returned by the platform. No personally identifying analytics, IPs, or browser fingerprints are sent.
* **When it is sent:** only when an admin or shopper actively uses a Mockup100 feature (open the designer, browse artwork, generate a preview, prepare a cart / order line). The plugin does not make outbound calls during regular WordPress page views.
* **Terms & privacy:**
    * Terms of Service: <https://www.mockup100.com/terms>
    * Privacy Policy: <https://www.mockup100.com/privacy>

Please review the linked terms and privacy policy before enabling the service for your site.

== Optional Paid Mockup100 Services ==

The free plugin itself is fully usable without paying anything: bind templates, run the designer, generate single-size mockup previews, add the configured product to cart, and write template / job / output metadata to WooCommerce orders all work for free.

Some advanced workflows rely on optional external Mockup100 services. Free users can keep using the rest of the designer; if an optional external service is unavailable for the current account, the SaaS endpoint returns the error and the free plugin itself does NOT contain any license-key check or local paywall gate.

* **Grading workspace** — opens the optional Mockup100 grading service for multi-size pattern output generation. Service access is managed on mockup100.com, outside this plugin. Endpoint: `https://www.mockup100.com/api/v1/runtime/templates/{id}/grading/compose`.
* **Order edit page Grading entry** — adds a "Generate Grading Sizes" button next to each Mockup100-bound order line item. Visible only to users with the `edit_shop_orders` capability. The first click shows a browser confirmation dialog disclosing the destination domain (`https://www.mockup100.com`) and the fields that will be sent (template id, part keys); no request leaves the site until the user explicitly accepts. Site administrators can disable this entry and its REST route at any time under `Mockup100 > Settings > Order Grading Entry`. Endpoint: `https://www.mockup100.com/api/v1/external/runtime/templates/{id}/grading/compose`.
* **Cloud token service page** — opens `https://www.mockup100.com/pricing#tokens` so the site administrator can review optional token packages used for HD render output and premium artwork licensing. The 512 px preview render remains free for all users.
* **WordPress Pro Add-on** — a separate, separately-distributed paid WordPress plugin (`mockup100-pod-customizer-pro`) for bulk order export and team permissions. It is NOT bundled in this free plugin, is never required for the free features to work, and no part of that paid plugin is shipped, downloaded, auto-activated, or invoked by this free plugin.

All four are 100% optional. Clicking any of them performs an explicit user action (opening an external Mockup100 page, or invoking a Mockup100 SaaS endpoint that is already disclosed under "External Services" above). You only pay if you actively complete a purchase / subscription on mockup100.com.

== Privacy & GDPR ==

* The plugin does not place any cookies, run analytics, or load third-party trackers on the storefront.
* Customer-supplied design data (template id, text layers, uploaded artwork, selected variation) is persisted only in WooCommerce cart item / order line item metadata on the host site, and pushed to Mockup100 strictly for fulfillment / preview rendering.
* On uninstall, the plugin removes its own `postmeta` (`_mockup100_*`) and `usermeta` (`_mockup100_artwork_licenses`, `_mockup100_uploaded_artworks`, `_mockup100_grading_external_consent`) entries to avoid leaving customer data behind.
* No data is shared with any third party other than the Mockup100 platform listed in the External Services section above.

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/`, or install the zip via `Plugins > Add New > Upload Plugin`.
2. Activate the plugin through the `Plugins` menu in WordPress.
3. Open `Mockup100 > Settings` from the WordPress admin sidebar.
4. Keep the platform base URL as `https://www.mockup100.com` and enter your tenant API key.
5. Edit a WooCommerce product, switch to the `Mockup100 Templates` tab, and bind one or more templates.
6. Open the product detail page on the storefront and click `Design` to enter the customizer.

== Frequently Asked Questions ==

= Does this plugin require a Mockup100 account? =

Yes. You need a Mockup100 tenant account and an API key to enable template binding and preview rendering.

= Does this plugin work without WooCommerce? =

No. The plugin only registers product binding, cart, and order hooks when WooCommerce is active. It will display an admin notice and stay inactive otherwise.

= Where is the customer's design data stored? =

Design payloads (templates, jobs, outputs, preview URLs) are persisted in WooCommerce cart item and order line item metadata, and pushed back to the Mockup100 platform through authenticated REST proxy calls.

= Does the plugin track users or send analytics data? =

No. The plugin does not collect or transmit any user analytics. The only outbound traffic is authenticated calls to the Mockup100 API endpoints needed to render previews and prepare orders.

== Screenshots ==

Screenshot files are tracked under `assets/screenshots/` in the source repository (not bundled inside the plugin zip per WordPress.org guidelines — they are uploaded separately to `assets/` on the SVN repo as `screenshot-1.png` ... `screenshot-4.png`).

1. Mockup100 admin settings: configure platform URL and tenant API key.
2. WooCommerce product editor: bind templates with category/keyword filters.
3. Standalone designer page: browse artwork, edit text, and switch product parts.
4. Cart and order summary: each design line item shows the rendered preview and selected attributes.

== Changelog ==

= 0.5.8 =
* Rework build reproducibility for WordPress.org review: the custom `mockup100-editor.umd.js` / `mockup100-editor.iife.js` bundle source now lives in this same plugin repository under `src/wordpress-editor/`, with `vite.config.wordpress.ts`, `package.json`, `package-lock.json`, and `scripts/build-frontend.mjs` documented and shipped together.
* Fix WordPress.org review items: move the product-page variation button script to `assets/js/product-design-button.js`, replace remaining wp-admin inline style attributes with `wp_add_inline_style()`, and remove single-binding wording from the product binding UI.
* Harden cart/order handling: add explicit `wp_verify_nonce('woocommerce-add-to-cart')` before reading the design payload, tighten cart-snapshot rename ownership checks to the expected `unique_key` prefix, and switch preview cache writes to `WP_Filesystem` with a guarded fallback.
* Correct metadata and disclosure: restore `Tested up to: 6.7`, bump `Stable tag` to `0.5.8`, reiterate the requested slug rename to `mockup100-pod-customizer`, and clarify that the WordPress Pro add-on is distributed separately outside WordPress.org.

= 0.5.7 =
* Add a wp-admin order edit page entry point for the optional Mockup100 Grading SaaS feature, designed against the WordPress.org plugin guidelines (no phoning home without disclosure, no admin hijack, no in-plugin paywall, full External Services disclosure, and a site-level kill switch).
    * New side meta box "Mockup100 Grading (optional add-on)" registered on classic `shop_order` and HPOS (`woocommerce_page_wc-orders`) screens, only for users with the `edit_shop_orders` capability. The meta box lists each Mockup100-bound order line item and provides a neutral "Generate Grading Sizes" button — no lock icons, no price tags, no "Pro" badges in the wp-admin chrome.
    * The first click triggers a browser confirmation dialog that explicitly discloses the destination (`https://www.mockup100.com` Grading API) and the fields to be sent (template id, part keys). Nothing leaves the site until the user accepts; on accept, the user-level consent is recorded in `_mockup100_grading_external_consent` user_meta so the dialog is shown only once per operator.
    * New REST route `POST /wp-json/mockup100/v1/order/{id}/grading/compose` proxies the request through `Mockup100_Api_Proxy::compose_grading()` (server-to-server, tenant API key never reaches the browser). Service-access checks remain on the Mockup100 SaaS side: if the external grading service is unavailable for the current account, the wp-admin UI shows a neutral "Open Mockup100 service page" link. The plugin code itself contains no license-key check.
    * New site-level kill switch `Mockup100 > Settings > Order Grading Entry` (option `mockup100_order_grading_enabled`, default on). When unticked, the meta box is not registered and the REST route returns `feature_disabled`, allowing administrators to fully sever the SaaS dependency at any time.
    * `readme.txt` extends the **Optional Paid Mockup100 Services** section with the new wp-admin order page entry point, lists the same outbound endpoint under **External Services**, and the Privacy & GDPR section documents the new `_mockup100_grading_external_consent` user_meta key. `uninstall.php` removes the new option and the new user_meta key alongside the existing cleanup so no Grading consent state lingers after uninstall.

= 0.5.6 =
* Fix `GET /wp-json/mockup100/v1/product/{id}/editor?template_id=...grading--{hash}` returning `400 Bad Request` ("Selected template is not available for this product."). The Grading workspace synthesizes a derived template id of the form `{baseTemplateId}grading--{hash}` for its in-workspace render calls; that derived id is never persisted as a WooCommerce product binding, so the strict equality match in `Mockup100_Rest_Controller::resolve_selected_binding` rejected it. The resolver now detects the `grading--{hash}` suffix, strips it, and falls back to matching the base template id against the bound bindings, allowing `/editor` (and the other resolver-backed endpoints) to return the correct workspace payload while keeping cart/order persistence locked to the original base template id.

= 0.5.5 =
* Order detail / WooCommerce admin order management parity with cart display: the `Design Thumbnail` line item meta now renders as an inline `<img>` (matching the cart thumbnail) instead of a raw URL string, in front-end My Account, transactional emails, and the wp-admin order edit screen. Relative `/wp-json/...` paths are auto-promoted to absolute URLs so email clients and Store API clients can load the image.
* Hide the redundant internal `_mockup100_*` order item meta keys (template_id / design_summary / placeOrderRows / place_order_clone / part_layers / outputs etc.) from the wp-admin "Custom fields" pane. Operators continue to see the human-readable labels (`Design Name`, `Design Thumbnail`, `Color`, `#1 …` text-layer labels, …) that were already added by `store_order_item_meta`.

= 0.5.4 =
* Merge WDplugin `4d17c15` disclosure update into the current 0.5.4 package: the optional Grading workspace documentation is handled as an external Mockup100 service disclosure, managed entirely on the SaaS side. The plugin remains free and contains no license-key check, paywall gate, or trial-state tracking.
* Preserve the current public pricing anchors (`https://www.mockup100.com/pricing#tokens`, `#grading`, and `#wp-pro`) as the default external links for WordPress.org review clarity, while keeping Settings-page overrides supported.

= 0.5.2 =
* WordPress.org Plugin Check (post-0.5.1) feedback:
    * Slug renamed from `mockup100-pod-customizer-wp` to `mockup100-pod-customizer` because `wp` is a wp.org reserved/restricted term and cannot appear in any plugin slug. The new slug, the main entry file (`mockup100-pod-customizer.php`), the textdomain, the `MOCKUP100_POD_CUSTOMIZER_*` PHP constants, the zip top-level folder, and the Pro add-on's `MOCKUP100_PRO_FREE_PLUGIN_BASENAME` reference were all updated in lockstep so update detection / textdomain loading remain consistent. (Safe to do because 0.4.x / 0.5.1 were never approved on wp.org SVN, so no installed user base loses an auto-update path.) Closes Plugin Check `trademarked_term`.
    * `Tested up to: 6.7` bumped to `7.0` so the listing keeps appearing in plugin search results. This was later corrected in `0.5.8` because WordPress 7.0 had not been released. Closes Plugin Check `outdated_tested_upto_header`.
    * `class-mockup100-settings.php::render_cloud_opt_in_field()` now passes the option key directly through `esc_attr()` at the `echo` concatenation site (instead of via an intermediate `$name` variable that PHPCS could not statically prove was escaped). Closes Plugin Check `WordPress.Security.EscapeOutput.OutputNotEscaped`.
    * `BUILD.md` and `THIRD-PARTY-NOTICES.md` moved from the plugin root to `docs/` so the wp.org packaged plugin only ships `readme.txt` at the root. The `readme.txt` "Source Code & Build" section and `scripts/package-plugin.sh` zip whitelist were updated to point at the new `docs/` paths. Closes Plugin Check `unexpected_markdown_file`.
    * `class-mockup100-designer-page.php` (`enqueue_local_editor_assets()` comment): the inline comment that documented the legacy approach contained a literal `<?php echo ?>` token, which PHP's tokenizer treats as a real closing tag even inside `//` comments — this caused a "Unclosed '{' on line 275" fatal parse error and made WordPress silently fail the "Activate" click in the Plugins screen. The example tag in the comment was rewritten as `<style> + echo + </style>` so the file no longer contains a stray `?>` token. Plugin can now be activated normally.

= 0.5.1 =
* Security (cart): Added a generic recursive sanitizer (`sanitize_payload_recursive`) and applied it to nested fields (`design_summary`, `outputs`, `part_layers`, `placeOrderRows`, `place_order_clone`) decoded from POST JSON before they are stored in cart item / order item meta. Closes WP review §7.
* Security (settings): `Mockup100_Settings::sanitize_endpoint()` now passes the trimmed URL through `esc_url_raw()` (with `http`/`https` protocol whitelist) instead of returning a raw trimmed string, eliminating the unsanitized `register_setting` callback. Closes WP review §11.
* Security (cart→order rename): `$renamePoRow` now performs a double ownership assertion — owner-uid prefix (`cart_snapshot_user_<uid>_`) AND `cart_item_key` match — before any OSS / MinIO copy/delete on `cart-snapshots/` / `order-snapshots/` objects, so a forged URL pointing at another user's snapshot will short-circuit instead of being copied or deleted. Closes WP review §12.
* Privacy (default-off cloud sync): `Mockup100_Plugin::sync_site_record_now()` and the order-status outbound webhook are now gated behind `OPTION_CLOUD_OPT_IN !== 1`, with `1` only being settable from a dedicated, explicit user opt-in toggle in the admin Settings page (default `0` / disabled). Closes WP review §8.
* Resource enqueuing (designer page): The standalone designer iframe page no longer emits `<style><?php echo $this->iframe_page_styles(); ?></style>` directly into `<head>`; the same CSS is now attached via `wp_add_inline_style('mockup100-umd-editor', ...)` so all designer-page CSS goes through the WP enqueue pipeline. Closes WP review §5.
* Build (defence in depth): `scripts/package-plugin.sh` explicitly removes any `mockup100-pod-customizer-pro/` tree if it ever lands inside the free plugin's working directory and asserts the produced zip's top-level folder name matches the slug, preventing accidental shipment of paid-only code through the wp.org distribution channel. Closes WP review §9.

= 0.4.79 =
* WordPress.org review feedback (slug / display name / textdomain rename):
    * Plugin display name renamed to **Mockup100 Print-on-Demand Customizer for WooCommerce** (was "POD Product Designer – Mockup100") — brand-prefixed, removes generic-keyword head, aligns with the wp.org reviewer guidance to lead with the unique brand mark.
    * wp.org SVN slug requested as `mockup100-pod-customizer` (was `pod-product-designer-mockup100`); plugin entry file, textdomain, zip top-level folder all renamed to match in lockstep so update detection / translate.wordpress.org binding stay consistent. (Safe to do because 0.4.78 was never approved on wp.org SVN, so no installed user base loses an auto-update path.)
    * All `__()` / `_e()` / `esc_html__()` calls migrated to the new textdomain `mockup100-pod-customizer`; PHP constants renamed `MOCKUP100_PREVIEW_PLUGIN_*` → `MOCKUP100_POD_CUSTOMIZER_PLUGIN_*` for consistency with the new slug.
    * `package-plugin.sh` `PACKAGE_NAME` and the platform jar embedded zip resource updated to the new slug; the `mockup100-pod-customizer.zip` outer filename was already in place since 0.4.78 and is kept unchanged.

= 0.4.78 =
* Security & WordPress.org review readiness:
    * Cart snapshot REST routes (`POST /cart-snapshots`) now require a logged-in user and bind every uploaded object key to a `cart_snapshot_user_${user_id}_` owner prefix to prevent cross-user overwrite / deletion.
    * `/runtime-asset` proxy GET enforces a strict host + path-prefix whitelist (Mockup100 platform domain and Aliyun OSS bucket domains, restricted to `/runtime/*`, `/grading/*`, `/cart-snapshots/*`, `/order-snapshots/*`, etc.); off-whitelist URLs return `403`.
    * Replace remaining `echo '<style>...</style>'` blocks in `class-mockup100-cart-meta.php` and `class-mockup100-product-binding.php` with `wp_register_style` + `wp_add_inline_style` so all CSS goes through the WP enqueue pipeline.
    * Extend `uninstall.php` to also clean per-user `usermeta` (`_mockup100_artwork_licenses`, `_mockup100_uploaded_artworks`) so no customer data is left behind after the plugin is removed.
* Distribution / readme:
    * `readme.txt` adds dedicated **Source Code & Build**, **External Services**, **Privacy & GDPR**, and **Screenshots placement** sections required by the WordPress.org plugin review checklist; `Tested up to` is set to `6.7`.
    * `scripts/package-plugin.sh` now ships the Vue source tree under `./src/` inside the release zip and excludes IDE / OS junk (`.idea/`, `.vscode/`, `Thumbs.db`, `.env*`, `node_modules/.cache/`, `tests/`, `phpunit.xml`).

= 0.4.75 =
* WordPress.org Plugin Check pass: resolve all 67 ERROR-level findings while keeping behavior unchanged.
* Security: convert every remaining `wp_redirect()` to `wp_safe_redirect()` followed by `exit;`; escape exception messages and translator strings (`esc_html__`, `esc_html`); split unsanitized `$_POST` / `$_GET` reads into `wp_unslash()` + appropriate sanitize helpers; gate every `error_log()` behind `defined('WP_DEBUG') && WP_DEBUG` with `phpcs:ignore` annotation.
* Plugin repository compliance: drop the bundled self-update mechanism (`class-mockup100-plugin-updater.php`, the `Update URI` header line, and the `MOCKUP100_PREVIEW_PLUGIN_UPDATE_URI` constant). Updates now follow the standard upload/install flow.
* i18n: align `class-mockup100-settings.php` to the canonical `mockup100-pod-customizer` text domain so all admin strings are translatable through one .pot.
* readme: bump `Tested up to` to 7.0 and trim the short description below the 150-character limit so it is no longer truncated in the directory listing.
* Other hygiene: replace `strip_tags()` with `wp_strip_all_tags()`; annotate uninstall-time direct DB cleanup and template-scope variables with `phpcs:ignore` plus a justification.

= 0.4.74 =
* Build/release: introduce single-source-of-truth versioning — `package.json#version` is the only manual edit point; `package-plugin.sh` auto-syncs the PHP Header `* Version:`, the `MOCKUP100_PREVIEW_PLUGIN_VERSION` constant, and `Stable tag:` in `readme.txt`, then cross-checks all three inside the produced zip.
* Build/release: enforce monotonic version increments by reading the previous release version out of `dist/*.zip` and rejecting downgrades (override with `FORCE_VERSION_DOWNGRADE=1` for rollbacks).
* Repo hygiene: remove duplicate landing-site assets (`carousel.js`, `favicon.*`, `logo*.svg`, `showcase*.png`, `sitemap.xml`, `robots.txt`, `images/`, `showcase/`) that were accidentally copied under `assets/js/`; only the editor JS bundle and `assets/css/mockup100-editor.css` are shipped now.

= 0.4.73 =
* Security & i18n hardening pass aligned with WordPress.org plugin review guidelines.
* Unify all translation calls to the `mockup100-pod-customizer` text-domain and add `translators:` comments for placeholder strings.
* Escape every dynamic output (`esc_html`, `esc_attr`, `esc_html__`, `wp_kses_post`) and switch unsafe `wp_redirect()` calls to `wp_safe_redirect()` followed by `exit()`.
* Add `wp_nonce_field` / `wp_verify_nonce` + `current_user_can()` capability checks for every form handler (product binding, variation save, designer page query handling).
* Sanitize all `$_GET` / `$_POST` reads via `wp_unslash()` + `sanitize_text_field()` / `sanitize_textarea_field()` and mark intentional raw reads with phpcs annotations.
* Wrap every `error_log()` call behind `if (defined('WP_DEBUG') && WP_DEBUG)` so production sites stay quiet by default.
* Annotate `tax_query` / `meta_query` lookups with phpcs notes and limit result sets to mitigate slow-query risk on large catalogs.
* Bundle `fabric@6.0.2` locally under `assets/vendor/fabric/`; remove the third-party CDN registration so all static assets are served from the plugin itself.

= 0.4.66 =
* Surface the auto-update column on the Plugins screen by registering the WP 5.8+ `update_plugins_{hostname}` filter for the configured Update URI.
* Stop persisting transient runtime job preview URLs (`/external/runtime/jobs/{jobId}/outputs/{i}/preview`) as the design's main image, preventing stale 404s after the upstream job expires.
* Translate upstream 4xx errors from the runtime executor into the matching status code instead of opaque 500s when previewing or downloading job outputs.

= 0.4.65 =
* Align cart line item layout with the Place Order modal: render the design preview, design name, color, and per-row text layers as separate cart entries.
* Calculate Place Order totals using each variation's unit price instead of the product base price.
* Submit each Requirement row as an independent cart line so multiple requirements no longer merge in the cart.
* Harden security: REST/AJAX nonce checks, prefix global symbols, and guard WooCommerce-only hooks behind `class_exists('WooCommerce')`.

= 0.2.0 =
* Align the WooCommerce plugin with the final preview-parity external API contract.
* Cover template workspace, artwork browse / detail / license / purchase, preview rendering, and prepare-for-cart flows through the WordPress REST BFF.
* Refresh the packaged install zip and platform download metadata for the new release.

= 0.1.1 =
* Refresh the packaged WooCommerce plugin release and sync the distributed install zip with the current Mockup100 platform download.

= 0.1.0 =
* Initial WooCommerce product binding and standalone designer integration.
* Expanded the product-page designer with part switching, multi-layer editing, richer text styling, layer visibility and locking, and drag-to-sort layer management.
* Added workspace-based WordPress REST initialization, artwork library browsing, and paid artwork unlock/use actions.

== Upgrade Notice ==

= 0.4.73 =
Recommended upgrade. Security and i18n hardening pass aligned with WordPress.org review guidelines (text-domain unification, output escaping, nonce + capability checks, local fabric vendor, debug-gated logs).

= 0.4.71 =
Recommended upgrade. Cart images now reliably reflect the latest main-view render in the customer-selected color, and cart/order OSS snapshots are renamed and cleaned up automatically.

= 0.4.66 =
Recommended upgrade. Restores the auto-update column on Plugins screen and stops persisting expiring runtime job preview URLs as design main images.

= 0.4.65 =
Recommended upgrade. Improves cart presentation for multi-requirement orders and tightens security to align with WordPress.org plugin guidelines.
