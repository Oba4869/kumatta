# チームでの作業の進め方

## はじめに（1回だけ）

```
git clone https://github.com/<owner>/<repo>.git
cd <repo>
npm install
npm run dev        # http://localhost:5173 で開く
```

Node.js 22 以上を使ってください。

## 作業の流れ

1. **最新の main を取り込む**
   ```
   git switch main
   git pull
   ```
2. **作業用のブランチを作る**（名前は「種類/内容」）
   ```
   git switch -c feat/minimap-zoom
   ```
   | 種類 | 使うとき |
   |---|---|
   | `feat/` | 新しい機能 |
   | `fix/` | 不具合の修正 |
   | `ui/` | 見た目・レイアウト |
   | `docs/` | 説明文・資料 |
3. **こまめにコミットする**（1コミット＝1つの変更）
   ```
   git add -A
   git commit -m "マップに見つかったクマを表示"
   ```
4. **push してプルリクエストを作る**
   ```
   git push -u origin feat/minimap-zoom
   ```
   GitHub に出る「Compare & pull request」から作成し、テンプレートに沿って書きます。
5. **チームの誰か1人が確認して OK なら main にマージ**
   main にマージされると、GitHub Pages に自動で公開されます。

## ルール

- **main に直接 push しない**。必ずプルリクエストを通す。
- プルリクエストを出す前に、手元で確認する。
  ```
  npm run build      # 型チェック＋ビルドが通ること
  ```
  プルリクエストでも同じチェックが自動で走ります（CI）。
- 見た目を変えたときは、**PC と スマホ** のスクリーンショットをプルリクエストに貼る。
- 同じファイルを同時に大きく変えるとぶつかりやすいので、担当を分ける。

## どこに何があるか

| 担当しやすい単位 | 主なファイル |
|---|---|
| 3Dゲーム本体（クマのAI、操作、HUD） | `src/game3d/game.ts` |
| 3Dの見た目（森、クマ、光） | `src/game3d/world.ts` `actors.ts` `materials.ts` `post.ts` |
| 効果音 | `src/game3d/audio3d.ts` |
| スタート画面 | `src/components/StartScreen.tsx` `HeroScene.tsx` `src/start.css` |
| 結果画面 | `src/components/ResultScreen.tsx` `src/result.css` |
| ゲーム中の画面の部品 | `src/components/PlayScreen.tsx` `src/index.css`（`.g3-` で始まる部分） |
| 色・余白などの共通ルール | `src/ui.css` |
| 山の条件・道具・図鑑・バッジ・レベル | `src/data/` |
| ふりかえりの文章・採点 | `src/game/feedback.ts` `scoring.ts` |

## ぶつかった（コンフリクトした）とき

```
git switch main && git pull
git switch <自分のブランチ>
git merge main
```
衝突したファイルを開き、`<<<<<<<` と `>>>>>>>` の間を正しい内容に直してから、コミットします。迷ったら、そのファイルを最後に触った人に相談してください。
