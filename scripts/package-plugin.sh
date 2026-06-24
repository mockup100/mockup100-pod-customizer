#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$PLUGIN_DIR/dist"
# WP.org SVN slug, 与主文件名 / textdomain / zip 内顶层目录全部保持一致。
# 注:0.4.78 → 0.4.79 期间随 wp.org 审核反馈把这五个值从原 `pod-product-designer-mockup100`
# 整体迁移到 `mockup100-pod-customizer`,详见 readme.txt 0.4.79 changelog 与
# docs/four-products-roadmap.md §0.1 / §3.1。后续如再次提交 wp.org SVN,该 slug
# 就成为不可变锚点。
PACKAGE_NAME="mockup100-pod-customizer"
# 平台内嵌下载与对外发布的 zip 文件基名,与 four-products-roadmap.md §0.1 锁定的
# `mockup100-pod-customizer.zip` 命名保持一致(自 0.4.78 起此值未变)。
ZIP_BASENAME="mockup100-pod-customizer"
PACKAGE_DIR="$DIST_DIR/$PACKAGE_NAME"
ZIP_PATH="$DIST_DIR/${ZIP_BASENAME}.zip"

# ---------------------------------------------------------------------------
# 版本号同步:以 package.json 的 version 字段为单一权威来源(SSOT),自动写回
#   1) mockup100-pod-customizer.php 的 PHP Header "* Version:" 字段
#   2) mockup100-pod-customizer.php 的 MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION 常量
#   3) readme.txt 的 "Stable tag:" 字段
# 这样今后 bump 版本只需改 package.json,其他 3 处自动同步,避免漏改导致后台
# 显示旧版本的问题。
# ---------------------------------------------------------------------------
PACKAGE_JSON="$PLUGIN_DIR/package.json"
PLUGIN_PHP="$PLUGIN_DIR/mockup100-pod-customizer.php"
README_TXT="$PLUGIN_DIR/readme.txt"

if [[ ! -f "$PACKAGE_JSON" ]]; then
  echo "package.json not found at $PACKAGE_JSON" >&2
  exit 1
fi

# 从 package.json 提取 version(纯文本解析,避免依赖 jq/node)
PLUGIN_VERSION="$(grep -E '^[[:space:]]*"version"[[:space:]]*:' "$PACKAGE_JSON" \
  | head -n1 \
  | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')"

if [[ -z "${PLUGIN_VERSION:-}" ]]; then
  echo "Failed to extract version from package.json" >&2
  exit 1
fi

echo "[mockup100-preview-plugin] Syncing version: $PLUGIN_VERSION (source: package.json)"

# ---------------------------------------------------------------------------
# 单调递增校验:从上一次构建产物 dist/${PACKAGE_NAME}.zip 中读取已发布的 PHP Header
# Version 作为 baseline,要求新版本必须严格大于旧版本(sort -V 语义比较)。
# 防止把 0.4.73 误改成 0.4.7 / 0.4.72 等更小版本号。
# - 若 dist 中尚无 zip(首次构建),跳过校验。
# - 紧急逃生:设置 FORCE_VERSION_DOWNGRADE=1 可临时绕过(例如回滚发布)。
# ---------------------------------------------------------------------------
PREV_VERSION=""
if [[ -f "$ZIP_PATH" ]]; then
  PREV_VERSION="$(unzip -p "$ZIP_PATH" "$PACKAGE_NAME/mockup100-pod-customizer.php" 2>/dev/null \
    | grep -E '^[[:space:]]*\*[[:space:]]*Version:' | head -n1 | sed -E 's/.*Version:[[:space:]]*//')"
fi

if [[ -n "$PREV_VERSION" && "$PREV_VERSION" != "$PLUGIN_VERSION" ]]; then
  # sort -V 排序后,如果新版本不是排在最后一行,说明 new <= prev
  HIGHEST="$(printf '%s\n%s\n' "$PREV_VERSION" "$PLUGIN_VERSION" | sort -V | tail -n1)"
  if [[ "$HIGHEST" != "$PLUGIN_VERSION" ]]; then
    if [[ "${FORCE_VERSION_DOWNGRADE:-0}" == "1" ]]; then
      echo "[warn] Version downgrade detected: $PREV_VERSION -> $PLUGIN_VERSION (FORCE_VERSION_DOWNGRADE=1, continuing)" >&2
    else
      echo "Version must be strictly greater than the previous release:" >&2
      echo "  previous (dist zip) : $PREV_VERSION" >&2
      echo "  current  (package.json) : $PLUGIN_VERSION" >&2
      echo "Set FORCE_VERSION_DOWNGRADE=1 to bypass (e.g. for rollback)." >&2
      exit 1
    fi
  fi
elif [[ -n "$PREV_VERSION" && "$PREV_VERSION" == "$PLUGIN_VERSION" ]]; then
  echo "[warn] Version unchanged from previous local build ($PREV_VERSION); remember to bump package.json#version before publishing." >&2
fi

# 1) PHP Header "* Version: x.y.z"
if [[ -f "$PLUGIN_PHP" ]]; then
  sed -i -E "s|^([[:space:]]*\*[[:space:]]*Version:[[:space:]]*).*$|\1${PLUGIN_VERSION}|" "$PLUGIN_PHP"
  # 2) define('MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION', 'x.y.z');
  sed -i -E "s|(define\([[:space:]]*'MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION'[[:space:]]*,[[:space:]]*')[^']*('[[:space:]]*\)[[:space:]]*;)|\1${PLUGIN_VERSION}\2|" "$PLUGIN_PHP"
fi

# 3) readme.txt "Stable tag: x.y.z"
if [[ -f "$README_TXT" ]]; then
  sed -i -E "s|^(Stable tag:[[:space:]]*).*$|\1${PLUGIN_VERSION}|" "$README_TXT"
fi

# 同步后做一次源文件一致性校验(防止 sed 失败留下脏数据)
HEADER_VER="$(grep -E '^[[:space:]]*\*[[:space:]]*Version:' "$PLUGIN_PHP" | head -n1 | sed -E 's/.*Version:[[:space:]]*//')"
DEFINE_VER="$(grep -E "MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION" "$PLUGIN_PHP" | head -n1 | sed -E "s/.*'MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION'[[:space:]]*,[[:space:]]*'([^']+)'.*/\1/")"
README_VER="$(grep -E '^Stable tag:' "$README_TXT" | head -n1 | sed -E 's/^Stable tag:[[:space:]]*//')"

if [[ "$HEADER_VER" != "$PLUGIN_VERSION" || "$DEFINE_VER" != "$PLUGIN_VERSION" || "$README_VER" != "$PLUGIN_VERSION" ]]; then
  echo "Version sync failed:" >&2
  echo "  package.json    : $PLUGIN_VERSION" >&2
  echo "  PHP Header      : $HEADER_VER" >&2
  echo "  define() const  : $DEFINE_VER" >&2
  echo "  readme.txt tag  : $README_VER" >&2
  exit 1
fi

if [[ -f "$PLUGIN_DIR/package.json" ]]; then
  if command -v npm >/dev/null 2>&1; then
    (cd "$PLUGIN_DIR" && npm run build >/dev/null)
  elif [[ ! -f "$PLUGIN_DIR/assets/js/editor-app.js" || ! -f "$PLUGIN_DIR/assets/css/editor-app.css" ]]; then
    echo "npm is required to build plugin assets, but npm is not available." >&2
    exit 1
  else
    echo "npm is not available; packaging existing built assets." >&2
  fi
fi

rm -rf "$PACKAGE_DIR" "$ZIP_PATH"
mkdir -p "$PACKAGE_DIR"

(
  cd "$PLUGIN_DIR"
  # 0.4.78 (Task 8.7): WordPress.org 审核要求 zip 内必须包含可读的 Vue 源码 (./src/)
  # 以便审稿人重新运行 `npm run build` 重现 assets/js / assets/css。同时排除
  # IDE / OS 工程文件、本地 .env 秘钥、测试夹具,这些既无运行价值也可能含敏感信息。
  tar \
    --exclude='./dist' \
    --exclude='./dev-harness' \
    --exclude='./.git' \
    --exclude='./.gitignore' \
    --exclude='./.gitattributes' \
    --exclude='./.DS_Store' \
    --exclude='./Thumbs.db' \
    --exclude='./.idea' \
    --exclude='./.vscode' \
    --exclude='./.env' \
    --exclude='./.env.*' \
    --exclude='./README.md' \
    --exclude='./node_modules' \
    --exclude='./tests' \
    --exclude='./scripts/package-plugin.sh' \
    --exclude='./scripts/test-rest-controller.php' \
    --exclude='./scripts/test-settings-and-binding.php' \
    --exclude='./phpunit.xml' \
    --exclude='./phpunit.xml.dist' \
    -cf - . | (cd "$PACKAGE_DIR" && tar -xf -)
)

# 0.5.1 (WP review §3.6): 防御性兜底 — 即便当前 Free 仓库内本无 wp-pro-addon 目录,
# 仍在 staging 内强制清理一次,确保任何意外混入的付费拓展代码绝不会出现在开源 zip。
find "$PACKAGE_DIR" -type d -name 'wp-pro-addon' -prune -exec rm -rf {} +

# wp.org 发行包只保留最小可重建入口 scripts/build-frontend.mjs。
# 其余 scripts/* (本地 harness / package helper / PHP test stubs) 留在公开仓库即可。
if [[ -d "$PACKAGE_DIR/scripts" ]]; then
  find "$PACKAGE_DIR/scripts" -mindepth 1 ! -name 'build-frontend.mjs' -exec rm -rf {} +
fi

(
  cd "$DIST_DIR"
  rm -f "$ZIP_PATH"
  zip -rq "$ZIP_PATH" "$PACKAGE_NAME"
)

# ---------------------------------------------------------------------------
# 打包后从 zip 内回读三处版本号做交叉校验,任一不一致直接 exit 1,
# 防止后台显示旧版本/zip 元数据落后于源码的问题。
# ---------------------------------------------------------------------------
ZIP_HEADER_VER="$(unzip -p "$ZIP_PATH" "$PACKAGE_NAME/mockup100-pod-customizer.php" \
  | grep -E '^[[:space:]]*\*[[:space:]]*Version:' | head -n1 | sed -E 's/.*Version:[[:space:]]*//')"
ZIP_DEFINE_VER="$(unzip -p "$ZIP_PATH" "$PACKAGE_NAME/mockup100-pod-customizer.php" \
  | grep -E "MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION" | head -n1 \
  | sed -E "s/.*'MOCKUP100_POD_CUSTOMIZER_PLUGIN_VERSION'[[:space:]]*,[[:space:]]*'([^']+)'.*/\1/")"
ZIP_README_VER="$(unzip -p "$ZIP_PATH" "$PACKAGE_NAME/readme.txt" \
  | grep -E '^Stable tag:' | head -n1 | sed -E 's/^Stable tag:[[:space:]]*//')"

if [[ "$ZIP_HEADER_VER" != "$PLUGIN_VERSION" || "$ZIP_DEFINE_VER" != "$PLUGIN_VERSION" || "$ZIP_README_VER" != "$PLUGIN_VERSION" ]]; then
  echo "Zip version cross-check failed:" >&2
  echo "  package.json     : $PLUGIN_VERSION" >&2
  echo "  zip PHP Header   : $ZIP_HEADER_VER" >&2
  echo "  zip define const : $ZIP_DEFINE_VER" >&2
  echo "  zip readme tag   : $ZIP_README_VER" >&2
  exit 1
fi

# 0.5.1 (WP review §3.6 / §7 GPL): zip 内容完整性校验 — 必须包含 readme.txt、可读 src/ 源码、
# docs/BUILD.md 构建说明,以及最小可执行的前端构建入口 scripts/build-frontend.mjs,确保审核方能
# 重现 assets/js + assets/css。测试桩和 shell 打包器保留在公开仓库,不进入 wp.org 发行包。
# 0.5.2 (Plugin Check unexpected_markdown_file fix): BUILD.md / THIRD-PARTY-NOTICES.md
# 已从插件根迁至 docs/ 子目录,白名单条目同步更新。
ZIP_LISTING="$(unzip -l "$ZIP_PATH")"
for required in \
  "$PACKAGE_NAME/readme.txt" \
  "$PACKAGE_NAME/src/" \
  "$PACKAGE_NAME/scripts/build-frontend.mjs" \
  "$PACKAGE_NAME/package.json" \
  "$PACKAGE_NAME/package-lock.json" \
  "$PACKAGE_NAME/vite.config.wordpress.ts" \
  "$PACKAGE_NAME/docs/BUILD.md" \
  "$PACKAGE_NAME/mockup100-pod-customizer.php"
do
  if ! grep -qE "[[:space:]]${required//./\\.}" <<< "$ZIP_LISTING"; then
    echo "Zip content check failed: missing required entry '$required'" >&2
    exit 1
  fi
done

# wp.org 发行包只保留最小可重建文件集合,不包含开发态 test/package helper。
for forbidden in \
  "$PACKAGE_NAME/scripts/package-plugin.sh" \
  "$PACKAGE_NAME/scripts/serve-harness.mjs" \
  "$PACKAGE_NAME/scripts/test-rest-controller.php" \
  "$PACKAGE_NAME/scripts/test-settings-and-binding.php"
do
  if grep -qE "[[:space:]]${forbidden//./\\.}" <<< "$ZIP_LISTING"; then
    echo "Zip content check failed: forbidden development helper '$forbidden' detected inside release zip" >&2
    exit 1
  fi
done

# 同时确保付费目录绝不在 zip 中(防御性,Free 仓库本就不应携带)
if grep -qE "[[:space:]]${PACKAGE_NAME}/wp-pro-addon" <<< "$ZIP_LISTING"; then
  echo "Zip content check failed: forbidden directory 'wp-pro-addon' detected inside Free zip" >&2
  exit 1
fi

echo "Built plugin package:"
echo "  $ZIP_PATH"
echo "  Version: $PLUGIN_VERSION (PHP Header / define() / readme Stable tag — all in sync)"
