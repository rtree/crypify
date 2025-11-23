# GitHub Copilot Instructions

## Testing Guidelines

### Playwright Testing
- **WebのURLをテストするときは必ずPlaywrightを使ってください**
- **Playwrightはheadless=falseにして私にも見えるようにしてください**
  - ブラウザウィンドウを表示してテストを実行します
  - デバッグやUI確認が容易になります

### Test Email Addresses
- **テストに使うメルアドは `arakitomohiko+xxxxxxx@gmail.com` を使ってください**
  - `xxxxxxx` 部分は任意の英数字で、テストケースに応じて新規作成または前回と同じを使い分けてください
  - 例: 
    - `arakitomohiko+test001@gmail.com` (初回テスト)
    - `arakitomohiko+newwallet@gmail.com` (新規ウォレット作成テスト)
    - `arakitomohiko+existingwallet@gmail.com` (既存ウォレットテスト)

## Development Workflow

### Server Management
- APIサーバーとWebサーバーは別々のターミナルで起動してください
- ログを確認できるように、バックグラウンドではなくフォアグラウンドで実行してください

### Environment Variables
- `.env.local` ファイルは必ず正しい値を設定してください
- CDP Project IDやCLAIM_SECRETなどの重要な値は一貫性を保つこと
