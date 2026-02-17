## ADDED Requirements

### Requirement: NewebPay MPG checkout flow
The system SHALL integrate NewebPay MPG for Pro plan subscriptions.

#### Scenario: Create MPG checkout form
- **WHEN** a Free user clicks "Upgrade to Pro"
- **THEN** the system SHALL generate an AES-encrypted MPG form (TradeInfo) with $14.99 monthly subscription details and auto-submit to NewebPay

#### Scenario: MPG form data structure
- **WHEN** generating MPG form
- **THEN** the TradeInfo SHALL include:
  - MerchantID（商店代號）
  - MerchantOrderNo（訂單編號，唯一）
  - Amt（金額：14.99 * 匯率）
  - ItemDesc（品項：Podify Pro 月訂閱）
  - Email（用戶 email）
  - ReturnURL（付款完成前端 redirect）
  - NotifyURL（付款結果後端 callback）
  - CREDIT=1（啟用信用卡）

#### Scenario: MPG AES encryption
- **WHEN** generating TradeInfo
- **THEN** the system SHALL:
  1. 組合表單資料為 query string
  2. 使用 AES-256-CBC 加密（Key=NEWEBPAY_HASH_KEY, IV=NEWEBPAY_HASH_IV）
  3. 產生 TradeSha（SHA256 hash）用於驗證

#### Scenario: Payment success (Return URL)
- **WHEN** the user completes payment on NewebPay
- **THEN** the user SHALL be redirected to ReturnURL (/billing/success) with encrypted result

#### Scenario: Payment cancelled
- **WHEN** the user cancels on NewebPay payment page
- **THEN** the user SHALL be redirected back to the pricing page with plan unchanged

### Requirement: NewebPay Notify URL callback
The system SHALL process NewebPay Notify URL callbacks for payment results.

#### Scenario: Receive Notify callback
- **WHEN** NewebPay POST payment result to NotifyURL (/api/billing/notify)
- **THEN** the system SHALL:
  1. 接收 TradeInfo（AES 加密字串）
  2. 使用 HashKey/HashIV 解密
  3. 驗證 CheckCode（SHA256）
  4. 根據 Status 更新訂閱狀態

#### Scenario: Payment success (Notify)
- **WHEN** Notify callback with Status=SUCCESS
- **THEN** the system SHALL:
  - Update users.plan='pro'
  - Set users.newebpay_trade_no = TradeNo
  - Set users.subscription_start_date = now
  - Clear users.subscription_end_date

#### Scenario: Payment failed (Notify)
- **WHEN** Notify callback with Status != SUCCESS
- **THEN** the system SHALL log the failure and NOT update plan

#### Scenario: AES decryption verification
- **WHEN** decrypting TradeInfo
- **THEN** the system SHALL verify CheckCode matches SHA256(HashKey + decrypted data + HashIV)

#### Scenario: Idempotent callback processing
- **WHEN** a Notify callback is received with a MerchantOrderNo that was already processed
- **THEN** the system SHALL skip processing and return 200 OK

### Requirement: Subscription management
The system SHALL provide subscription management functionality.

#### Scenario: View subscription status
- **WHEN** a Pro user views "管理訂閱" page
- **THEN** the system SHALL display:
  - 當前方案：Pro（$14.99/月）
  - 下次扣款日期
  - 取消訂閱按鈕

#### Scenario: Cancel subscription
- **WHEN** a Pro user clicks "取消訂閱"
- **THEN** the system SHALL:
  - Set users.subscription_end_date = end of current billing cycle
  - Display "訂閱將於 YYYY-MM-DD 到期，到期前仍可使用 Pro 功能"

#### Scenario: Subscription expiry check
- **WHEN** a user with subscription_end_date tries to access Pro features
- **THEN** the system SHALL:
  - Allow access if now < subscription_end_date
  - Downgrade to Free and deny access if now >= subscription_end_date

#### Scenario: Daily expiry cron job
- **WHEN** daily cron runs at 00:00
- **THEN** the system SHALL downgrade all users with subscription_end_date < today to plan='free'

### Requirement: Subscription renewal (manual)
The system SHALL support manual subscription renewal after cancellation.

#### Scenario: Renew cancelled subscription
- **WHEN** a user with subscription_end_date clicks "續訂"
- **THEN** the system SHALL clear subscription_end_date and set next billing date

**Note:** MVP 不實作自動續訂，需用戶主動重新訂閱（重新走 MPG 流程）。
