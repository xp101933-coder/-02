# YouTube動画戦略分析AI デプロイガイド

このアプリケーションは静的なHTML/JS/CSSで構成されているため、Cloudflare PagesやNetlifyなどのホスティングサービスで無料で簡単に公開できます。

## デプロイ手順 (Cloudflare Pages推奨)

### 1. 準備
1. この `app` フォルダの内容が、GitHubなどのリポジトリに含まれていることを確認してください。
2. もしフォルダ単体でデプロイする場合は、`app` フォルダをドラッグ＆ドロップでデプロイできるサービス（Netlify Dropなど）も利用可能です。

### 2. Cloudflare Pagesへのデプロイ
1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログインし、**Workers & Pages** > **Create application** > **Pages** > **Connect to Git** を選択します。
2. このリポジトリを選択します。
3. **Build settings** で以下のように設定します：
    - **Framework preset**: None (または空白)
    - **Build command**: (空欄のまま)
    - **Build output directory**: (空欄のまま) ※重要: ファイルがリポジトリのルートにあるため
4. **Save and Deploy** をクリックします。

### 3. デプロイ後の設定
デプロイが完了すると、`https://your-project.pages.dev` のようなURLが発行されます。

1. **OGP設定の更新**:
   - `app/index.html` を開き、以下の行を実際のURLに書き換えてコミット＆プッシュしてください。
     ```html
     <meta property="og:url" content="https://あなたのサイトのURL.pages.dev" />
     ```
   - これにより、SNSでシェアされた際に正しいリンク先が表示されるようになります。

2. **動作確認**:
   - サイトにアクセスし、YouTube URLを入力して分析機能が動作することを確認してください。
