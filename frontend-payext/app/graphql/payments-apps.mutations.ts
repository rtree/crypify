/**
 * Shopify Payments Apps GraphQL Mutations
 * 
 * These mutations are used to communicate payment status back to Shopify.
 * They are called from the payment page after processing crypto transactions.
 */

export const PAYMENT_SESSION_RESOLVE = `
  mutation PaymentSessionResolve($id: ID!) {
    paymentSessionResolve(id: $id) {
      paymentSession {
        id
        state {
          ... on PaymentSessionStateResolved {
            code
          }
        }
        nextAction {
          action
          context {
            ... on PaymentSessionActionsRedirect {
              redirectUrl
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PAYMENT_SESSION_REJECT = `
  mutation PaymentSessionReject($id: ID!, $reason: PaymentSessionRejectionReasonInput!) {
    paymentSessionReject(id: $id, reason: $reason) {
      paymentSession {
        id
        state {
          ... on PaymentSessionStateRejected {
            code
            reason
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PAYMENT_SESSION_PENDING = `
  mutation PaymentSessionPending($id: ID!) {
    paymentSessionPending(id: $id) {
      paymentSession {
        id
        state {
          ... on PaymentSessionStatePending {
            code
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const REFUND_SESSION_RESOLVE = `
  mutation RefundSessionResolve($id: ID!) {
    refundSessionResolve(id: $id) {
      refundSession {
        id
        state {
          ... on RefundSessionStateResolved {
            code
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const REFUND_SESSION_REJECT = `
  mutation RefundSessionReject($id: ID!, $reason: RefundSessionRejectionReasonInput!) {
    refundSessionReject(id: $id, reason: $reason) {
      refundSession {
        id
        state {
          ... on RefundSessionStateRejected {
            code
            merchantMessage
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CAPTURE_SESSION_RESOLVE = `
  mutation CaptureSessionResolve($id: ID!) {
    captureSessionResolve(id: $id) {
      captureSession {
        id
        state {
          ... on CaptureSessionStateResolved {
            code
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CAPTURE_SESSION_REJECT = `
  mutation CaptureSessionReject($id: ID!, $reason: CaptureSessionRejectionReasonInput!) {
    captureSessionReject(id: $id, reason: $reason) {
      captureSession {
        id
        state {
          ... on CaptureSessionStateRejected {
            code
            merchantMessage
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const VOID_SESSION_RESOLVE = `
  mutation VoidSessionResolve($id: ID!) {
    voidSessionResolve(id: $id) {
      voidSession {
        id
        state {
          ... on VoidSessionStateResolved {
            code
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const VOID_SESSION_REJECT = `
  mutation VoidSessionReject($id: ID!, $reason: VoidSessionRejectionReasonInput!) {
    voidSessionReject(id: $id, reason: $reason) {
      voidSession {
        id
        state {
          ... on VoidSessionStateRejected {
            code
            merchantMessage
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Rejection reason codes for different session types
 */
export const PAYMENT_REJECTION_REASONS = {
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  RISKY: 'RISKY',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  BUYER_CANCELED: 'BUYER_CANCELED',
} as const;

export const REFUND_REJECTION_REASONS = {
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  MERCHANT_DECISION: 'MERCHANT_DECISION',
} as const;

export const CAPTURE_REJECTION_REASONS = {
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  AUTHORIZATION_EXPIRED: 'AUTHORIZATION_EXPIRED',
  RISKY: 'RISKY',
} as const;

export const VOID_REJECTION_REASONS = {
  PROCESSING_ERROR: 'PROCESSING_ERROR',
} as const;
