import {
  reactExtension,
  Banner,
  BlockStack,
  Button,
  Text,
  useApi,
} from '@shopify/ui-extensions-react/checkout';

// Crypify - Crypto Payment Button for Checkout
export default reactExtension('purchase.checkout.block.render', () => <CrypifyPaymentButton />);

function CrypifyPaymentButton() {
  const { extension, shop } = useApi();

  const handleCryptoPayment = () => {
    // For now, open payment page in new window
    // In production, this should redirect properly within Shopify checkout flow
    const appUrl = "https://moses-efficient-disabilities-governing.trycloudflare.com";
    const paymentUrl = `${appUrl}/app/pay/demo-checkout-token`;
    
    console.log('[Crypify] Opening crypto payment:', paymentUrl);
    
    // Note: window.open may be blocked by popup blockers
    // Alternative: use Shopify's redirect API when available
    if (typeof window !== 'undefined') {
      window.open(paymentUrl, '_blank');
    }
  };

  return (
    <BlockStack spacing="base">
      <Banner title="Pay with Crypto (USDC)" status="success">
        <Text>
          Pay using USDC on Base blockchain
        </Text>
      </Banner>
      
      <Button kind="primary" onPress={handleCryptoPayment}>
        🪙 Pay with USDC on Base
      </Button>
      
      <Text size="small" appearance="subdued">
        Powered by Coinbase CDP • Instant settlement • Low fees ($0.01)
      </Text>
    </BlockStack>
  );
}