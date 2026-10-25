export type PaymentMethodType = 'cash' | 'mock_gcash' | 'mock_card';

export interface PaymentDetails {
  // GCash
  mobileNumber?: string;
  // Card
  cardNumber?: string;
  expiryDate?: string;
  cvc?: string;
}

export interface PaymentResult {
  success: boolean;
  message: string;
}

/**
 * Simulates a payment gateway authorization.
 * @param amount - The total amount to charge
 * @param method - The payment method
 * @param details - The payment details provided by the user
 * @returns PaymentResult indicating success or failure
 */
export async function processPayment(
  amount: number,
  method: PaymentMethodType,
  details?: PaymentDetails
): Promise<PaymentResult> {
  if (amount <= 0) {
    return { success: false, message: 'Invalid payment amount.' };
  }

  // Cash requires no authorization
  if (method === 'cash') {
    return { success: true, message: 'Cash payment selected.' };
  }

  // Simulate network latency (1.5 seconds)
  await new Promise((resolve) => setTimeout(resolve, 1500));

  if (method === 'mock_card') {
    if (!details?.cardNumber || !details?.expiryDate || !details?.cvc) {
      return { success: false, message: 'Incomplete card details.' };
    }

    const normalizedCard = details.cardNumber.replace(/\s+/g, '');

    // Test failure scenario
    if (normalizedCard.startsWith('4000')) {
      return { success: false, message: 'Card was declined. Please try another card.' };
    }

    // Success for standard test card or any other 16-digit card
    if (normalizedCard.length >= 15) {
      return { success: true, message: 'Payment authorized successfully.' };
    }

    return { success: false, message: 'Invalid card number format.' };
  }

  if (method === 'mock_gcash') {
    if (!details?.mobileNumber) {
      return { success: false, message: 'Mobile number is required for GCash.' };
    }

    const normalizedNumber = details.mobileNumber.replace(/\s+/g, '');
    
    // Simulate failure if number starts with 0999
    if (normalizedNumber.startsWith('0999')) {
        return { success: false, message: 'GCash authorization failed due to insufficient balance.' };
    }

    if (normalizedNumber.length >= 10) {
      return { success: true, message: 'GCash payment authorized successfully.' };
    }

    return { success: false, message: 'Invalid mobile number format.' };
  }

  return { success: false, message: 'Unsupported payment method.' };
}
