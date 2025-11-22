import React from 'react';
import {
  reactExtension,
  Banner,
  BlockStack,
  Button,
  Text,
  useApi,
  useApplyAttributeChange,
} from '@shopify/ui-extensions-react/checkout';

/**
 * Crypify - Crypto Payment Extension for Shopify Checkout
 * Provides USDC payment option on Base L2 blockchain
 */
export default reactExtension(
  'purchase.checkout.block.render',
  () => <CrypifyPaymentButton />
);

function CrypifyPaymentButton(): React.ReactElement {
  const {
    cost,
    checkoutToken,
  } = useApi();
  
  const applyAttributeChange = useApplyAttributeChange();

  const handleCryptoPayment = async (): Promise<void> => {
    try {
      // Get checkout data from Shopify API
      const token = checkoutToken?.value || 'demo-token';
      const totalAmount = cost.totalAmount.current?.amount || '0';
      const currency = cost.totalAmount.current?.currencyCode || 'USD';

      console.log('[Crypify] Opening crypto payment:', {
        checkoutToken: token,
        amount: totalAmount,
        currency,
      });

      // Mark checkout as pending crypto payment
      const result = await applyAttributeChange({
        type: 'updateAttribute',
        key: 'crypto_payment_pending',
        value: 'true',
      });

      console.log('[Crypify] Attribute update result:', result);

      // Construct payment URL
      const appUrl = 'https://moses-efficient-disabilities-governing.trycloudflare.com';
      const paymentUrl = `${appUrl}/app/pay/${token}?amount=${totalAmount}&currency=${currency}`;

      console.log('[Crypify] Payment URL:', paymentUrl);

      // Open payment page (may be blocked by popup blockers in some browsers)
      if (typeof window !== 'undefined' && window.open) {
        window.open(paymentUrl, '_blank');
      }
    } catch (error) {
      console.error('[Crypify] Error handling crypto payment:', error);
    }
  };

  return (
    <BlockStack spacing="base">
      <Banner title="Pay with Crypto (USDC)" status="success">
        Pay using USDC on Base blockchain - Fast, secure, low fees
      </Banner>

      <Button kind="primary" onPress={handleCryptoPayment}>
        🪙 Pay with USDC on Base
      </Button>

      <Text size="small" appearance="subdued">
        Powered by Coinbase CDP • Instant settlement • Fees: $0.01
      </Text>
    </BlockStack>
  );
}