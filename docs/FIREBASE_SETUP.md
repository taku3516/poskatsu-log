# Firebase手動設定手順

ポス活ログは、Firebase未設定でも端末内保存で利用できます。この設定を行うと、同じGoogleアカウントでログインした複数端末間で活動記録を同期できます。

この手順ではCloud Storage、Cloud Functions、Firebase Hostingは使いません。写真機能がないため、原則として無料のSparkプランで開始できます。

## 事前確認

- GitHub Pagesの公開URL: `https://taku3516.github.io/poskatsu-log/`
- Firebaseプロジェクト名の例: `poskatsu-log`
- 課金プラン: Spark（無料）
- 使用する機能: Authentication、Cloud Firestore

## 1. Firebaseプロジェクトを作成する

1. [Firebaseコンソール](https://console.firebase.google.com/)を開きます。
2. 「プロジェクトを作成」を押します。
3. プロジェクト名に `poskatsu-log` を入力します。
4. Googleアナリティクスは、不要であれば無効で構いません。
5. 「プロジェクトを作成」を押し、完了を待ちます。

## 2. Webアプリを登録する

1. プロジェクト概要でWebアイコン `</>` を押します。
2. アプリのニックネームに「ポス活ログ」と入力します。
3. 「Firebase Hostingも設定する」は選択しません。
4. 「アプリを登録」を押します。
5. 表示された `firebaseConfig` の次の4項目を控えます。

```js
apiKey
authDomain
projectId
appId
```

## 3. 設定値を入力する

ローカルの `data/firebase-config.js` を開き、空欄をFirebaseコンソールの値に置き換えます。

```js
export const FIREBASE_CONFIG = {
  apiKey: "ここへ入力",
  authDomain: "ここへ入力",
  projectId: "ここへ入力",
  appId: "ここへ入力"
};
```

FirebaseのWeb設定値は秘密鍵ではありません。ただし、Firestore Security Rulesが正しく公開される前にアプリを公開しないでください。

## 4. Googleログインを有効にする

1. Firebaseコンソール左側の「構築」→「Authentication」を開きます。
2. 「始める」を押します。
3. 「Sign-in method」タブを開きます。
4. 「Google」を選択します。
5. 「有効にする」をオンにします。
6. プロジェクトのサポートメールを選択します。
7. 「保存」を押します。

## 5. 承認済みドメインを確認する

1. Authenticationの「Settings」→「Authorized domains」を開きます。
2. 次のドメインが登録されていることを確認します。

```text
localhost
taku3516.github.io
```

`taku3516.github.io` がない場合は「Add domain」から追加します。パス `/poskatsu-log/` は入力せず、ドメインだけを入力します。

## 6. Cloud Firestoreを作成する

1. 左側の「構築」→「Firestore Database」を開きます。
2. 「データベースの作成」を押します。
3. 「本番環境モード」を選択します。
4. ロケーションを選択します。日本での利用を優先する場合は東京リージョンを選びます。
5. 作成完了を待ちます。

ロケーションは後から簡単に変更できないため、作成前に確認してください。

## 7. Firestoreルールを公開する

方法Aのコンソール操作を推奨します。

### 方法A: Firebaseコンソール

1. Firestore Databaseの「ルール」タブを開きます。
2. ローカルの `firebase/firestore.rules` を開きます。
3. 内容をすべてコピーし、コンソールのルール欄へ貼り付けます。
4. 「公開」を押します。

このルールは、ログイン中のUIDと同じ `users/{uid}` 配下だけを読み書き可能にします。

### 方法B: Firebase CLI

CLIに慣れている場合だけ使用してください。

```bash
cd firebase
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

## 8. ローカルで確認する

ファイルを直接ダブルクリックせず、ローカルサーバーで開きます。

```bash
python3 -m http.server 4173
```

ブラウザで `http://localhost:4173/` を開きます。

確認項目:

1. 「Googleでログイン」を押せる。
2. Googleログイン後、右上に表示名または「同期中」が表示される。
3. 活動を1件登録する。
4. Firebaseコンソールで `users → UID → app → state` が作成される。
5. 別端末または別ブラウザで同じGoogleアカウントへログインし、記録が表示される。
6. 別のGoogleアカウントでは先ほどの記録が表示されない。

## 9. GitHubへ設定を反映する

設定値を入力した `data/firebase-config.js` をコミットしてGitHubへpushします。GitHub Pagesの公開完了後、次を確認します。

```text
https://taku3516.github.io/poskatsu-log/
```

ログインできない場合は、最初にAuthenticationの承認済みドメインを確認してください。

## 10. よくある問題

### 「Firebase設定が必要」と表示される

`data/firebase-config.js` の4項目に空欄があります。引用符やカンマを削除していないかも確認します。

### Googleログインで unauthorized-domain と表示される

AuthenticationのAuthorized domainsへ `taku3516.github.io` を追加します。

### permission-denied と表示される

Firestoreルールが未公開、または古いルールです。`firebase/firestore.rules` とコンソールの内容を照合して再公開します。

### 別のGoogleアカウントの記録が見える

直ちに公開を止め、Firestoreルールを確認してください。正常な構成では別UIDのデータは読み取れません。

### 同期前にブラウザを閉じた

端末内には記録が残ります。通信状態を戻して同じブラウザでアプリを開き、右上が「同期済み」になるまで待ちます。
