# Context: ETHGlobal Buenos Aires 2025 Hackathon

## あなたの役割
Shopify Payment Extension "crypfy" の実装を完全サポートしてください。
このプロジェクトは、Coinbase CDPを活用したCrypto決済システムです。

## Storategy


**Day 1 (8時間)**
- [ ] 環境構築完了 (1時間)
- [ ] Shopify App初期化 (1時間)
- [ ] Payment Extension生成 (1時間)
- [ ] CDP Server Wallet統合 (2時間)
- [ ] 基本的な決済フロー実装 (3時間)

**Day 2 (8時間)**
- [ ] Embedded Wallets統合 (2時間)
- [ ] Checkout UI Extension実装 (2時間)
- [ ] Onramp統合 (2時間)
- [ ] 決済完了フロー実装 (2時間)

**Day 3 (8時間)**
- [ ] Base Sepoliaテストネット検証 (2時間)
- [ ] エラーハンドリング強化 (2時間)
- [ ] デモ準備 (2時間)
- [ ] ピッチデッキ作成 (2時間)

### 🔥 優先度設定

**P0 (絶対必須 - 賞金獲得に必要)**
1. Payment Extension動作
2. CDP Server Wallets統合
3. USDC送金成功
4. Shopify注文作成

**P1 (重要 - デモで魅せる)**
1. Embedded Wallets (Passkey認証)
2. Onramp (カード→USDC)
3. UI/UX改善

**P2 (あれば良い - 追加点)**
1. Trade API (トークンスワップ)
2. x402 (AI Agent決済)
3. マルチチェーン対応

### 💡 デモ準備チェックリスト

**動作確認項目**
- [ ] Dev Storeでチェックアウト画面に"Crypto (USDC)"が表示される
- [ ] "Connect Wallet"クリックでPasskey認証が起動
- [ ] USDC送金が成功する（Tx Hashが取得できる）
- [ ] Shopifyで注文が自動作成される
- [ ] Base ScanでTxが確認できる

**ピッチポイント**
- ✅ **Shopifyネイティブ** - Theme Appではなく正式Payment Extension
- ✅ **CDP完全統合** - 6製品すべて使用（賞金条件クリア）
- ✅ **UX優先** - Passkey認証でシードフレーズ不要
- ✅ **実用性** - 本番リリース可能な品質

### 🎤 審査員への想定Q&A

**Q: Onrampは審査必要？ハッカソン中に使える？**
A: **審査不要で即座に使える！** CDP Project作成で25トランザクション（各$5）が自動付与。Sandbox環境（https://pay-sandbox.coinbase.com）でテストカード（4242 4242 4242 4242）を使ってテスト可能。本番審査は不要。

### Award related memo

- ✅ Server Wallets v2
- ✅ Embedded Wallets (Base Account SDK)
- ✅ Onramp API
- ✅ Trade API
- ✅ x402 Protocol
- ✅ OnchainKit UI

**サブ狙い: vlayer ($10,000)**
- ZKプルーフで決済検証
- プライバシー保護（金額を隠す）

**サブ狙い: Hardhat ($10,000)**
- スマートコントラクトテスト
- ローカル開発環境

**Base Chain統合**
- Base Builderへのアピールポイント


**最低限の成功**
✅ Payment Extensionが動作  
✅ USDC送金が成功  
✅ CDP製品を3つ以上統合  
✅ デモが完走できる  

**理想的な成功（大賞狙える）**
✅ 上記 + Embedded Wallets  
✅ 上記 + Onramp統合  
