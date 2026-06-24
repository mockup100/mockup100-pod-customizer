# Build Reproducibility — Mockup100 POD Customizer WP

This document tells WordPress.org reviewers and any GPL recipient how to
rebuild every custom-generated asset shipped in this plugin from the
human-readable source code that travels with the same repository and release
package.

The WordPress.org release zip is intentionally not a full development sandbox.
It only carries the minimum source and build files required to study and
rebuild the shipped frontend assets. Packaging helpers and local PHP test stubs
remain available in the public GitHub repository, but are excluded from the
runtime distribution archive so the release package stays review-friendly.

## 1. Toolchain

| Tool | Version |
|------|---------|
| Node.js | >= 18 |
| npm | bundled with Node.js |
| PHP | >= 7.4 (only required for `npm run check`) |

The first `npm install` downloads public npm dependencies. The actual build
does not depend on any private sibling repository or proprietary toolchain.

## 2. Source Layout (inside the release zip)

```text
mockup100-pod-customizer/
├── mockup100-pod-customizer.php
├── readme.txt
├── package.json
├── package-lock.json
├── vite.config.wordpress.ts
├── scripts/
│   └── build-frontend.mjs
├── docs/
│   ├── BUILD.md
│   └── THIRD-PARTY-NOTICES.md
├── assets/
│   ├── js/
│   │   ├── editor-app.js
│   │   ├── mockup100-editor.umd.js
│   │   ├── mockup100-editor.iife.js
│   │   └── vue.global.js
│   └── css/
│       ├── editor-app.css
│       └── mockup100-editor.css
└── src/
    ├── editor/
    │   ├── main.js
    │   └── styles.css
    └── wordpress-editor/
        ├── pod-customizer/index.ts
        ├── router/wordpress/mockRouter.ts
        ├── components/
        ├── composables/
        ├── i18n/
        ├── pages/
        ├── stores/
        ├── styles/
        └── utils/
```

## 3. Asset Mapping

- `assets/js/editor-app.js` <- `src/editor/main.js`
- `assets/css/editor-app.css` <- `src/editor/styles.css`
- `assets/js/mockup100-editor.umd.js` <- `src/wordpress-editor/pod-customizer/index.ts` via `vite.config.wordpress.ts`
- `assets/js/mockup100-editor.iife.js` <- `src/wordpress-editor/pod-customizer/index.ts` via `vite.config.wordpress.ts`
- `assets/css/mockup100-editor.css` <- CSS imported by the same WordPress editor entry
- `assets/js/vue.global.js` <- vendored upstream `node_modules/vue/dist/vue.global.prod.js`

## 4. Rebuild Steps

```bash
unzip mockup100-pod-customizer.zip
cd mockup100-pod-customizer

# only required once after unpacking
npm install

# rebuild legacy editor assets and sync WordPress bundle outputs into assets/
npm run build

# optional: rebuild only the WordPress UMD/IIFE bundle into dist-wordpress/
npm run build:wordpress
```

Expected results:

- `npm run build` updates `assets/js/editor-app.js`, `assets/css/editor-app.css`,
  `assets/js/mockup100-editor.umd.js`, `assets/js/mockup100-editor.iife.js`,
  `assets/css/mockup100-editor.css`, and `assets/js/vue.global.js`
- `npm run build:wordpress` updates `dist-wordpress/mockup100-pod-customizer.umd.js`,
  `dist-wordpress/mockup100-pod-customizer.iife.js`, and
  `dist-wordpress/mockup100-pod-customizer.css`

Exact byte-for-byte identity is not required. The requirement is that reviewers
can study, modify, and regenerate the shipped custom bundles from the shipped
source tree and build configuration.

## 5. Third-Party Libraries

- `assets/js/vue.global.js` is the upstream Vue 3 global production build (MIT)
- `assets/vendor/fabric/fabric-6.0.2.min.js` is the upstream fabric.js build (MIT)

Their provenance and licenses are documented in `THIRD-PARTY-NOTICES.md`.

## 6. Public Source Repository

The maintained public repository is:

- GitHub: <https://github.com/mockup100/mockup100-pod-customizer>
- Mirror (primary CI): <https://cnb.cool/befash-2025/3dreal/mockup-SAAS> (`repos/mockup-saas-wordpress-plugin/`)

The release package and the public repository expose the same source tree and
build entry points for the custom WordPress editor bundle.

Additional development helpers that are intentionally kept out of the release
zip, such as `scripts/package-plugin.sh` and local PHP test stubs, remain
publicly accessible in the GitHub repository above.
