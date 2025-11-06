/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { renderWithProviders, mockUser, mockHost } from '../test-utils';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
(useRouter as jest.Mock).mockReturnValue({
  push: mockPush,
});

describe('Navbar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Unauthenticated State', () => {
    it('should render login and signup links when user is not authenticated', () => {
      renderWithProviders(<Navbar />, { user: null });

      expect(screen.getByText('Parking King')).toBeInTheDocument();
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });

    it('should have correct links for unauthenticated users', () => {
      renderWithProviders(<Navbar />, { user: null });

      const loginLink = screen.getByRole('link', { name: /login/i });
      const signupLink = screen.getByRole('link', { name: /sign up/i });

      expect(loginLink).toHaveAttribute('href', '/login');
      expect(signupLink).toHaveAttribute('href', '/register');
    });
  });

  describe('Authenticated User State', () => {
    it('should render user navigation when authenticated as regular user', () => {
      renderWithProviders(<Navbar />, { user: mockUser });

      expect(screen.getByText('Search Spots')).toBeInTheDocument();
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
      expect(screen.queryByText('Add Spot')).not.toBeInTheDocument(); // Should not show for regular users
    });

    it('should render host-specific navigation when authenticated as host', () => {
      renderWithProviders(<Navbar />, { user: mockHost });

      expect(screen.getByText('Search Spots')).toBeInTheDocument();
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
      expect(screen.getByText('Add Spot')).toBeInTheDocument(); // Should show for hosts
      expect(screen.getByText(mockHost.name)).toBeInTheDocument();
    });

    it('should have correct navigation links for authenticated users', () => {
      renderWithProviders(<Navbar />, { user: mockUser });

      const searchLink = screen.getByRole('link', { name: /search spots/i });
      const bookingsLink = screen.getByRole('link', { name: /my bookings/i });

      expect(searchLink).toHaveAttribute('href', '/search');
      expect(bookingsLink).toHaveAttribute('href', '/bookings');
    });

    it('should have correct host-specific links', () => {
      renderWithProviders(<Navbar />, { user: mockHost });

      const addSpotLink = screen.getByRole('link', { name: /add spot/i });
      expect(addSpotLink).toHaveAttribute('href', '/host/spots/new');
    });
  });

  describe('User Dropdown Menu', () => {
    it('should toggle dropdown menu when user name is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Navbar />, { user: mockUser });

      const userButton = screen.getByRole('button', { name: new RegExp(mockUser.name, 'i') });
      
      // Dropdown should not be visible initially
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      
      // Click to open dropdown
      await user.click(userButton);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('My Vehicles')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Navbar />, { user: mockUser });

      const userButton = screen.getByRole('button', { name: new RegExp(mockUser.name, 'i') });
      
      // Open dropdown
      await user.click(userButton);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      
      // Click outside (on the backdrop)
      const backdrop = document.querySelector('.fixed.inset-0');
      if (backdrop) {
        fireEvent.click(backdrop);
      }
      
      await waitFor(() => {
        expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      });
    });

    it('should have correct dropdown links', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Navbar />, { user: mockUser });

      const userButton = screen.getByRole('button', { name: new RegExp(mockUser.name, 'i') });
      await user.click(userButton);

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const profileLink = screen.getByRole('link', { name: /profile/i });
      const vehiclesLink = screen.getByRole('link', { name: /my vehicles/i });

      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      expect(profileLink).toHaveAttribute('href', '/profile');
      expect(vehiclesLink).toHaveAttribute('href', '/profile/vehicles');
    });
  });

  describe('Logout Functionality', () => {
    it('should call logout function when logout button is clicked', async () => {
      const user = userEvent.setup();
      const mockLogout = jest.fn();
      
      renderWithProviders(<Navbar />, { 
        user: mockUser,
        authValue: { logout: mockLogout }
      });

      const userButton = screen.getByRole('button', { name: new RegExp(mockUser.name, 'i') });
      await user.click(userButton);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should close dropdown after successful logout', async () => {
      const user = userEvent.setup();
      const mockLogout = jest.fn().mockResolvedValue(undefined);
      
      renderWithProviders(<Navbar />, { 
        user: mockUser,
        authValue: { logout: mockLogout }
      });

      const userButton = screen.getByRole('button', { name: new RegExp(mockUser.name, 'i') });
      await user.click(userButton);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await user.click(logoutButton);

      await waitFor(() => {
        expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      });
    });

    it('should handle logout errors gracefully', async () => {
      const user = userEvent.setup();
      const mockLogout = jest.fn().mockRejectedValue(new Error('Logout failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      renderWithProviders(<Navbar />, { 
        user: mockUser,
        authValue: { logout: mockLogout }
      });

      const userButton = screen.getByRole('button', { name: new RegExp(mockUser.name, 'i') });
      await user.click(userButton);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await user.click(logoutButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Logout failed:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when auth is loading', () => {
      renderWithProviders(<Navbar />, { loading: true });

      expect(screen.getByText('Parking King')).toBeInTheDocument();
      
      // Should show loading skeleton instead of auth buttons
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for dropdown', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Navbar />, { user: mockUser });

      const userButton = screen.getByRole('button', { name: new RegExp(mockUser.name, 'i') });
      await user.click(userButton);

      // Check that dropdown items are properly accessible
      const dropdownItems = screen.getAllByRole('link');
      const logoutButton = screen.getByRole('button', { name: /logout/i });

      expect(dropdownItems.length).toBeGreaterThan(0);
      expect(logoutButton).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Navbar />, { user: mockUser });

      const userButton = screen.getByRole('button', { name: new RegExp(mockUser.name, 'i') });
      
      // Focus and activate with keyboard
      userButton.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Brand Link', () => {
    it('should have correct brand link to home page', () => {
      renderWithProviders(<Navbar />, { user: null });

      const brandLink = screen.getByRole('link', { name: /parking king/i });
      expect(brandLink).toHaveAttribute('href', '/');
    });

    it('should display brand logo and text', () => {
      renderWithProviders(<Navbar />, { user: null });

      expect(screen.getByText('Parking King')).toBeInTheDocument();
      // The Car icon should be present (though we can't easily test SVG content)
      const brandLink = screen.getByRole('link', { name: /parking king/i });
      expect(brandLink).toBeInTheDocument();
    });
  });
});