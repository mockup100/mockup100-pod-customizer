# Third-Party Notices — Mockup100 POD Customizer WP

This plugin is licensed under **GPLv2 or later**. It bundles or relies on
the following third-party libraries; this file lists their upstream source,
version, and license so that GPL recipients can satisfy their own
attribution duties.

The plugin's own PHP and Vue source code is © 2025 Mockup100 contributors.

---

## 1. Vue 3

- File shipped: `assets/js/vue.global.js`
- Upstream: <https://github.com/vuejs/core>
- Version: **3.5.31**
- License: **MIT**
- Copyright: © 2018-present Yuxi (Evan) You and Vue contributors
- Verification: the file's leading comment block contains the upstream
  banner `vue v3.5.31 (c) 2018-present Yuxi (Evan) You and Vue contributors @license MIT`.

```
The MIT License (MIT)

Copyright (c) 2018-present, Yuxi (Evan) You and Vue contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

## 2. fabric.js

- File shipped: `assets/vendor/fabric/fabric-6.0.2.min.js`
- Upstream: <https://github.com/fabricjs/fabric.js>
- Version: **6.0.2**
- License: **MIT**
- Copyright: © 2008-2024 Printio (Juriy Zaytsev)

```
The MIT License (MIT)

Copyright (c) Printio (Juriy Zaytsev, Maxim Chernyak)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

## 3. WordPress / WooCommerce APIs

This plugin invokes WordPress core hooks and WooCommerce REST/PHP APIs but
does not bundle any of their source code. WordPress core is GPLv2+;
WooCommerce is GPLv3+. No conflict because GPLv2-or-later is forwards
compatible with GPLv3.

---

## 4. Mockup100 Platform External Service

The plugin makes outbound HTTPS requests to `https://www.mockup100.com/api/v1/external/...`
and to Aliyun OSS prefixes documented in the plugin's `readme.txt`
"External Services" section. No third-party code is bundled for this
purpose; the calls use WordPress' own `wp_remote_*` HTTP API.
