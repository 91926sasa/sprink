# Sprink

TRPG シナリオを投稿・共有する Web サイトです。
シナリオ作者は、作品をチャプター単位で書いて公開できます。
遊ぶ側は、システムやジャンルで作品を探せます。
レビューやプレイ報告で、遊んだ感想も残せます。
「書いたシナリオの置き場所」と「遊ぶシナリオの探し場所」を一つにするのが狙いです。

ログインは TRPGO の共通アカウント（OIDC）で行います。
Sprink は TRPGO ファミリーのサービスの一つです。

## 主な機能

画面とサーバー API から確認できる機能です。

**シナリオの投稿と閲覧**

- 新規作成と編集ができます（`/scenarios/new`・`/scenarios/:id/edit`）。
- 入力項目はタイトル・概要・システム・ジャンルです。
- ほかに参加人数・想定時間・ネタバレ度・タグがあります。
- 本文はチャプターの並びで書きます。
- 本文はプレーンテキストです（Markdown 表示はありません）。
- 状態は下書き・公開・アーカイブ・削除の 4 つです。
- 公開範囲は public・unlisted・private の 3 つです。
- 詳細ページには目次と共有ボタンがあります。
- 公開時に、カバー画像を自動生成します（後述の hum 連携）。

**探す**

- 一覧画面ではキーワードとタグで絞り込めます。
- システムとジャンルは、URL の引数（`?system=`・`?genre=`）でだけ絞れます。
- 一覧 API は、さらに人数と作者（TRPGO のユーザー ID）でも絞れます。
- ランキングは閲覧数・評価・いいね・ブックマーク・レビュー数などで並べます。
- シリーズで、複数のシナリオを一つにまとめられます（作成と追加は API のみ・画面はシリーズの閲覧だけ）。

**反応と交流**

- レビュー（星 1〜5・ネタバレ指定つき）
- プレイ報告（人数・日付・所要時間つき）
- コメント・いいね・ブックマーク
- ユーザーのフォローと通知
- 不適切な投稿の通報（管理者が処理する API あり）

**サービス間 API**

ほかのサービスから、シナリオを登録するための API です。
`X-Service-Token` ヘッダーで認証します。

- `POST /api/v1/service/scenarios` — シナリオを作る（任意で即公開）
- `GET /api/v1/service/scenarios/:id` — シナリオの要約を取る
- `POST /api/v1/service/scenarios/:id/play-reports` — プレイ報告を登録する

`X-On-Behalf-Of` ヘッダーで、投稿者のユーザー ID を指定できます。
無指定なら、サービス用の仮想ユーザーで登録します。

## 技術構成

| 層 | 使っているもの |
| --- | --- |
| 言語 | TypeScript（Node.js 20 以上） |
| フロントエンド | React 18・React Router 6・Tailwind CSS・Vite 5 |
| サーバー | Express 4 |
| DB（本番） | PostgreSQL（`pg`）＋ Redis（`ioredis`） |
| DB（開発） | SQLite（`better-sqlite3`） |
| 認証 | TRPGO への OIDC（PKCE）＋ Cookie セッション |
| デプロイ | Dockerfile（node:20-alpine の多段ビルド） |

一つの Express プロセスが、API と画面の両方を返します。
API は `/api/v1` 以下です。
それ以外のパスは、ビルド済みの SPA を返します。

DB は起動時に自動で選ばれます。
`DATABASE_URL` が PostgreSQL を指し、接続できれば PostgreSQL です。
それ以外は SQLite に切り替わります。
マイグレーションは起動時に自動で流れます。
SQLite でユーザーが 0 人なら、開発用のサンプルデータも入ります。

## ディレクトリ構成

```
.
├── index.html            Vite の入口
├── Dockerfile            本番イメージ
├── .env.example          環境変数の見本
└── src/
    ├── server.ts         Express の起動点
    ├── main.tsx, App.tsx 画面の起動点とルーティング
    ├── pages/            画面（一覧・詳細・編集・ランキングほか）
    ├── components/       画面部品（レビュー・コメント・通知ほか）
    ├── layouts/          共通レイアウト
    ├── hooks/            useAuth
    ├── api.ts            画面から API を呼ぶ関数
    ├── routes/           API のルート定義
    ├── middleware/       認証・レート制限・セキュリティヘッダーほか
    ├── services/         セッション管理・カバー画像生成
    ├── db/
    │   ├── migrations/   PostgreSQL 用 SQL（sqlite/ に SQLite 用）
    │   ├── repositories/ テーブルごとのデータアクセス
    │   └── unified-client.ts  PostgreSQL と SQLite の切り替え
    ├── cache/            Redis クライアント
    ├── lib/              設定・OIDC・ID 生成など
    └── types/            ドメイン型と API の型
```

## ローカルでの起動

以下はコードと設定から読み取った手順です。
Node.js 20 以上が必要です。

```sh
npm install
cp .env.example .env
npm run dev
```

`npm run dev` は、次の 2 つを同時に起動します。

- API サーバー: http://localhost:3002 （`tsx watch`）
- 画面の開発サーバー: http://localhost:5175 （Vite）

Vite は `/api` を API サーバーへ中継します。
ブラウザでは 5175 番を開きます。

開発モードでは、SQLite が `./data/sprink-dev.db` に作られます。
PostgreSQL と Redis は要りません。
ログイン画面に、開発用の簡易ログインが出ます。
TRPGO の OIDC を試すなら、`TRPGO_OIDC_*` を設定します。

その他のコマンドです。

| コマンド | 内容 |
| --- | --- |
| `npm run typecheck` | 型チェック |
| `npm run build` | サーバー（tsc）と画面（Vite）をビルド |
| `npm start` | ビルド結果を起動（`dist/server.js`） |

## 本番で必要な設定

`NODE_ENV` が development 以外だと、起動時に次を検査します。
足りなければ起動を止めます。

- `SESSION_SECRET` — 既定値以外の強い乱数
- `DATABASE_URL` — PostgreSQL の接続先
- `CORS_ORIGIN` — 本番のドメイン（カンマ区切りで複数可）
- `SERVICE_TOKEN` — 設定するなら 32 文字以上

本番では、開発用の簡易ログインは無効です。
ログインは TRPGO の OIDC だけになります。

## TRPGO ファミリー内での位置づけ

設定とコードから読み取れる連携です。

- **TRPGO** — ログインの認証元です（OIDC・scope に `sprink`）。
  TRPGO のユーザー ID から、Sprink のユーザーを引く API があります。
  信頼レベルや管理者権限も、TRPGO から受け取ります。
- **hum** — 画像生成サービスです。
  シナリオ公開時に、カバー画像の生成を依頼します。
  `HUM_URL` が未設定なら、生成はしません。
- **Me'm** — 声つきリプレイのサービスです。
  サービス API のプレイ報告に、リプレイへのリンクを付けられます。
- サービス間 API は、ほかのサービスや自動処理からの投稿口です。
  どのサービスが呼んでいるかは、このリポからは未確認です。

## 未完成・未確認の点

コードを読んで気づいた点です。
動かして確かめたものではありません。

- **GM 専用チャプターが隠れません。**
  編集画面で「GM 専用」を付けられます。
  ただし詳細ページでは、本文がそのまま全員に表示されます。
- **ライセンス表示が常に「全権利保留」です。**
  DB にはライセンス列があります。
  ただし編集画面に入力欄がなく、読み出しもしていません。
- `npm run db:migrate` と `npm run db:seed` の実体ファイルがありません。
  マイグレーションとサンプルデータは、起動時に自動で入ります。
- ランキングの期間指定は、SQLite 用の日付関数を使っています。
  PostgreSQL で期間指定が動くかは未確認です。
- サービス API の一部は、PostgreSQL 専用のクライアントを直接呼びます。
  SQLite の開発環境で動くかは未確認です。
- `GET /api/v1/series/mine` は、手前の `/series/:id` に吸われる順序です。
  自分のシリーズ一覧が取れるかは未確認です。
- TRPGO ログインの途中状態を Redis に置きます。
  Redis の無い SQLite 環境で、OIDC ログインが通るかは未確認です。
- 通報を処理する管理画面はありません（API のみ）。
- プレイ報告の本文はプレーンテキストで表示されます。
  サービス API が付ける Me'm へのリンクは、`**` がそのまま見えます。
  リンクとしてはクリックできません。
- 自動テストはありません。
- 本番のデプロイ先と公開 URL は、このリポからは未確認です。
- `package.json` は MIT ライセンスですが、LICENSE ファイルはありません。

## 今後決めること

- GM 専用チャプターは、作者以外に隠すべきか。
- ライセンス選択を、投稿画面に出すか。
- LICENSE ファイルを置き、MIT を正式に宣言するか。
