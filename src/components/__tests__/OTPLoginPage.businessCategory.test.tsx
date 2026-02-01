import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OTPLoginPage from '@/components/OTPLoginPage';
import { vi } from 'vitest';

// Mock app context to provide minimal required values
const mockSetUser = vi.fn();
const mockSetCurrentCity = vi.fn();

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    cities: [{ id: '1', name: 'Test City', state: 'TS' }],
    setUser: mockSetUser,
    setCurrentCity: mockSetCurrentCity,
  }),
}));

// Mock supabase client
const updateMock = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
const insertMock = vi.fn().mockResolvedValue({ data: { id: 2 }, error: null });
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      return {
        select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
        update: updateMock,
        insert: insertMock,
      };
    },
    functions: { invoke: vi.fn().mockResolvedValue({ data: { success: true, demo_otp: '123456' } }) },
  },
}));

describe('OTPLoginPage business category', () => {
  it('requires category and sends business_category to supabase on seller register', async () => {
    const onSuccess = vi.fn();
    const onBack = vi.fn();

    render(<OTPLoginPage onBack={onBack} onSuccess={onSuccess} isSeller={true} />);

    // Enter phone and send OTP (will use mocked function)
    const phoneInput = screen.getByPlaceholderText('Enter 10-digit number');
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });
    const sendBtn = screen.getByText(/Send OTP/i);
    fireEvent.click(sendBtn);

    // Wait for OTP step and for demo OTP to be stored
    await waitFor(() => screen.getByText(/Verify OTP/));

    // Fill OTP inputs with demo OTP
    const otpInputs = screen.getAllByRole('textbox').slice(0,6);
    '123456'.split('').forEach((d, i) => {
      fireEvent.change(otpInputs[i], { target: { value: d } });
    });

    const verifyBtn = screen.getByText(/Verify OTP/i);
    fireEvent.click(verifyBtn);

    // Wait for seller-profile step
    await waitFor(() => screen.getByText(/Seller Profile/));

    // Fill seller details but skip category to assert validation
    const firmInput = screen.getByPlaceholderText('Firm Name');
    const managerInput = screen.getByPlaceholderText('Manager Name');
    fireEvent.change(firmInput, { target: { value: 'My Firm' } });
    fireEvent.change(managerInput, { target: { value: 'Manager' } });

    const submitBtn = screen.getByText(/Complete Registration/i);
    expect(submitBtn).toBeDisabled();

    // Select category
    const categorySelect = screen.getByLabelText(/Category/i);
    fireEvent.change(categorySelect, { target: { value: 'electronics' } });

    // Now button should be enabled
    await waitFor(() => expect(screen.getByText(/Complete Registration/i)).toBeEnabled());

    fireEvent.click(screen.getByText(/Complete Registration/i));

    // ensure supabase insert/update called with business_category
    await waitFor(() => {
      // either insert or update is called with object containing business_category
      const calledWithInsert = insertMock.mock.calls.some(call => {
        const payload = call[0];
        return payload && payload.business_category === 'electronics';
      });
      const calledWithUpdate = updateMock.mock.calls.some(call => {
        const payload = call[0];
        return payload && payload.business_category === 'electronics';
      });
      expect(calledWithInsert || calledWithUpdate).toBe(true);
    });
  });
});