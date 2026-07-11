# sizukutamago — portfolio

シングルページのポートフォリオサイト。白い水面の WebGL 背景（マウス/クリックで波紋）に、ハンドルとひとことだけを置いたミニマル構成。

## Stack

- **Astro**（静的出力 / アダプター無し）
- **素の WebGL** フラグメントシェーダーによる水面表現（Three.js 不使用）
- **GSAP** + **Lenis**（イントロ／モーション）
- フォント: Bricolage Grotesque（ワードマーク）/ Hanken Grotesk（本文）/ Geist Mono（UI）— すべてセルフホスト
- **Cloudflare Workers Static Assets** で配信

## Develop

パッケージマネージャは **pnpm**。

```bash
pnpm install
pnpm dev           # http://localhost:4321
pnpm build         # -> dist/
pnpm preview
```

## Quality

```bash
pnpm check         # Biome: lint + format チェック
pnpm check:fix     # Biome: 自動修正 + 整形
pnpm typecheck     # astro check（型）
```

Lint / format は **Biome**（`biome.json`）。`.astro` は対象外（Astro のツールで扱う）。
push / PR で GitHub Actions（`.github/workflows/ci.yml`）が check → typecheck → build を実行。

## Deploy (Cloudflare Workers)

```bash
pnpm exec wrangler login   # 初回のみ
pnpm deploy                # astro build && wrangler deploy
```

設定は `wrangler.jsonc`（`assets.directory: ./dist` のみ、Worker コード無し）。
デプロイ後、`astro.config.mjs` の `site` を実 URL に更新すると canonical / OG が正しくなる。

## Structure

```
src/
  layouts/Base.astro      # head / 固定水面キャンバス / スクリプト読込
  pages/index.astro       # 1ページ本体
  pages/404.astro
  scripts/water-gl.ts     # 水面シェーダー + 波紋 API（gl:drop イベント）
  scripts/motion.ts       # Lenis + GSAP イントロ / リビール / 波紋ディスパッチ
  styles/global.css       # デザイントークン
```
