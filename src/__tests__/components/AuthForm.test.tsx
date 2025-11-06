import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { signIn } from 'next-auth/react';
import AuthForm from '@/components/AuthForm';

// Mock next-auth
jest.mock('next-auth/react');
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;

describe('AuthForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders login form by default', () => {
        render(<AuthForm />);

        expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('switches to register mode when toggle is clicked', () => {
        render(<AuthForm />);

        const toggleButton = screen.getByText(/don't have an account/i);
        fireEvent.click(toggleButton);

        expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    it('validates email format', async () => {
        render(<AuthForm />);

        const emailInput = screen.getByLabelText(/email/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
        });
    });

    it('validates password length', async () => {
        render(<AuthForm />);

        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        fireEvent.change(passwordInput, { target: { value: '123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
        });
    });

    it('calls signIn with correct credentials on login', async () => {
        mockSignIn.mockResolvedValue({ ok: true } as any);

        render(<AuthForm />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockSignIn).toHaveBeenCalledWith('credentials', {
                email: 'test@example.com',
                password: 'password123',
                redirect: false,
            });
        });
    });

    it('shows loading state during form submission', async () => {
        mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

        render(<AuthForm />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        expect(screen.getByText(/signing in/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
    });

    it('displays error message on failed login', async () => {
        mockSignIn.mockResolvedValue({ error: 'Invalid credentials' } as any);

        render(<AuthForm />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        });
    });

    it('validates required fields in register mode', async () => {
        render(<AuthForm />);

        // Switch to register mode
        const toggleButton = screen.getByText(/don't have an account/i);
        fireEvent.click(toggleButton);

        const submitButton = screen.getByRole('button', { name: /sign up/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/name is required/i)).toBeInTheDocument();
            expect(screen.getByText(/email is required/i)).toBeInTheDocument();
            expect(screen.getByText(/password is required/i)).toBeInTheDocument();
        });
    });
});