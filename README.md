# sizukutamago — portfolio

シングルページのポートフォリオサイト。白い水面の WebGL 背景（マウス/クリックで波紋）に、ハンドルとひとことだけを置いたミニマル構成。

## Stack

- **Astro**（静的出力 / アダプター無し）
- **素の WebGL** フラグメントシェーダーによる水面表現（Three.js 不使用）
- **GSAP** + **Lenis**（イントロ／モーション）
- フォント: Bricolage Grotesque（ワードマーク）/ Hanken Grotesk（本文）/ Geist Mono（UI）— すべてセルフホスト
- **Cloudflare Workers Static Assets** で配信

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # -> dist/
npm run preview
```

## Deploy (Cloudflare Workers)

```bash
npx wrangler login        # 初回のみ
npm run build
npx wrangler deploy       # dist/ を静的アセットとして配信
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
