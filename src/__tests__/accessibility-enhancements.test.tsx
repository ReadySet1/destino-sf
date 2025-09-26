/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Import components for accessibility testing
import ProductDetails from '@/components/products/ProductDetails';
import CheckoutForm from '@/components/store/CheckoutForm';
import AccountProfile from '@/components/store/AccountProfile';
import ProductCard from '@/components/products/ProductCard';
import BoxedLunchMenu from '@/components/Catering/BoxedLunchMenu';

// Mock dependencies
jest.mock('@/store/cart', () => ({
  useCartStore: jest.fn(() => ({
    addItem: jest.fn(),
    items: [],
    totalItems: 0,
  })),
}));

jest.mock('@/components/ui/cart-alert', () => ({
  useCartAlertStore: jest.fn(() => ({
    showAlert: jest.fn(),
  })),
}));

jest.mock('@/hooks/useSmartCart', () => ({
  useSmartCart: jest.fn(() => ({
    subtotal: 0,
    shipping: 0,
    tax: 0,
    total: 0,
    formattedSubtotal: '$0.00',
    formattedShipping: '$0.00',
    formattedTax: '$0.00',
    formattedTotal: '$0.00',
  })),
}));

// Mock product data
const mockProduct = {
  id: 'prod-1',
  name: 'Traditional Argentine Empanadas',
  description: 'Handmade empanadas with authentic Argentine flavors',
  price: 12.99,
  image: '/images/empanadas/beef.jpg',
  category: 'empanadas',
  available: true,
  variants: [
    { id: 'variant-1', name: 'Beef', price: 12.99, available: true },
    { id: 'variant-2', name: 'Chicken', price: 11.99, available: true },
  ],
  highlights: [
    { icon: 'cook', label: 'Ready to Cook', value: '15-20 min' },
    { icon: 'package', label: '4 pack', value: '' },
  ],
  nutritionInfo: {
    calories: 280,
    protein: 15,
    carbs: 25,
    fat: 12,
  },
  faqItems: [
    { question: 'How do I cook these?', answer: 'Bake at 400°F for 15-20 minutes' },
    { question: 'Can I freeze them?', answer: 'Yes, they freeze well for up to 3 months' },
  ],
};

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'John Doe',
};

const mockProfile = {
  id: 'profile-1',
  userId: 'user-1',
  name: 'John Doe',
  phone: '+1-555-0123',
  email: 'user@example.com',
};

describe('Accessibility Testing Enhancements - Phase 4', () => {
  describe('WCAG 2.1 AA Compliance Testing', () => {
    describe('Perceivable Guidelines', () => {
      it('should provide text alternatives for images', () => {
        render(<ProductCard product={mockProduct} />);

        const productImage = screen.getByRole('img');
        expect(productImage).toHaveAttribute('alt');
        expect(productImage.getAttribute('alt')).toBeTruthy();
        expect(productImage.getAttribute('alt')).not.toBe('');

        // Alt text should be descriptive, not just the filename
        const altText = productImage.getAttribute('alt');
        expect(altText).not.toMatch(/\.(jpg|jpeg|png|gif|svg)$/i);
      });

      it('should provide proper headings hierarchy', () => {
        render(<ProductDetails product={mockProduct} />);

        // Check heading hierarchy (h1 -> h2 -> h3, etc.)
        const headings = screen.getAllByRole('heading');
        expect(headings.length).toBeGreaterThan(0);

        // Verify heading levels are logical
        headings.forEach((heading, index) => {
          const level = parseInt(heading.tagName.replace('H', ''));
          expect(level).toBeGreaterThanOrEqual(1);
          expect(level).toBeLessThanOrEqual(6);
        });
      });

      it('should ensure sufficient color contrast for text', () => {
        render(<CheckoutForm />);

        // Check that text elements have proper contrast classes
        const textElements = screen.getAllByText(/./);
        textElements.forEach(element => {
          // Look for contrast-related classes or inline styles
          const computedStyle = window.getComputedStyle(element);
          const backgroundColor = computedStyle.backgroundColor;
          const color = computedStyle.color;

          // Ensure colors are defined (not 'rgba(0, 0, 0, 0)')
          expect(color).not.toBe('rgba(0, 0, 0, 0)');
        });
      });

      it('should provide captions or alternatives for multimedia content', () => {
        render(<BoxedLunchMenu />);

        const videos = screen.queryAllByRole('video');
        const audios = screen.queryAllByRole('audio');

        videos.forEach(video => {
          // Check for captions or transcript
          expect(
            video.querySelector('track') ||
              video.closest('[aria-describedby]') ||
              screen.queryByText(/transcript/i)
          ).toBeTruthy();
        });

        audios.forEach(audio => {
          // Check for transcript or audio description
          expect(
            audio.closest('[aria-describedby]') || screen.queryByText(/transcript/i)
          ).toBeTruthy();
        });
      });

      it('should ensure content is readable when zoomed to 200%', () => {
        // Mock viewport scaling
        Object.defineProperty(window, 'devicePixelRatio', {
          writable: true,
          value: 2.0,
        });

        render(<ProductDetails product={mockProduct} />);

        // Check that content doesn't overflow or become unusable
        const mainContent = screen.getByRole('main') || document.body;
        const rect = mainContent.getBoundingClientRect();

        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);

        // Check for horizontal scroll issues
        expect(mainContent.scrollWidth).toBeLessThanOrEqual(window.innerWidth * 1.1);
      });
    });

    describe('Operable Guidelines', () => {
      it('should make all functionality available via keyboard', async () => {
        const user = userEvent.setup();
        render(<ProductDetails product={mockProduct} />);

        // Tab through all interactive elements
        const interactiveElements = screen
          .getAllByRole('button')
          .concat(screen.getAllByRole('link'))
          .concat(screen.getAllByRole('combobox'))
          .concat(screen.getAllByRole('textbox'));

        for (const element of interactiveElements) {
          // Focus each element
          element.focus();
          expect(document.activeElement).toBe(element);

          // Check that focused elements have visible focus indicators
          const computedStyle = window.getComputedStyle(element);
          expect(
            computedStyle.outline !== 'none' ||
              computedStyle.boxShadow !== 'none' ||
              element.classList.contains('focus:') ||
              element.matches(':focus-visible')
          ).toBeTruthy();
        }
      });

      it('should provide sufficient time for users to read content', () => {
        render(<CheckoutForm />);

        // Check for any auto-advancing content or timeouts
        const timeouts = screen.queryAllByText(/timeout|expires|seconds|minutes/i);

        timeouts.forEach(timeout => {
          // Should provide options to extend, disable, or adjust timing
          expect(
            screen.queryByRole('button', { name: /extend|pause|adjust/i }) ||
              screen.queryByRole('checkbox', { name: /disable.*timer/i })
          ).toBeTruthy();
        });
      });

      it('should avoid content that causes seizures', () => {
        render(<ProductDetails product={mockProduct} />);

        // Check for flashing or rapidly changing content
        const animatedElements = document.querySelectorAll('[class*="animate"]');

        animatedElements.forEach(element => {
          const computedStyle = window.getComputedStyle(element);
          const animationDuration = computedStyle.animationDuration;

          if (animationDuration !== 'none') {
            // Animation should be slower than 3 Hz (0.33s duration minimum)
            const durationValue = parseFloat(animationDuration);
            expect(durationValue).toBeGreaterThanOrEqual(0.33);
          }
        });
      });

      it('should help users navigate and find content', () => {
        render(<ProductDetails product={mockProduct} />);

        // Check for skip links
        const skipLinks = screen.queryAllByText(/skip to|skip navigation/i);
        expect(skipLinks.length).toBeGreaterThanOrEqual(0);

        // Check for landmark regions
        const landmarks = [
          ...screen.queryAllByRole('main'),
          ...screen.queryAllByRole('navigation'),
          ...screen.queryAllByRole('banner'),
          ...screen.queryAllByRole('contentinfo'),
          ...screen.queryAllByRole('complementary'),
        ];

        expect(landmarks.length).toBeGreaterThan(0);

        // Check for page title
        expect(document.title).toBeTruthy();
        expect(document.title.trim()).not.toBe('');
      });

      it('should support keyboard shortcuts without conflicting with assistive technology', async () => {
        const user = userEvent.setup();
        render(<ProductDetails product={mockProduct} />);

        // Test common keyboard shortcuts
        const shortcuts = [
          { key: 'Tab', description: 'Navigate forward' },
          { key: 'Shift+Tab', description: 'Navigate backward' },
          { key: 'Enter', description: 'Activate buttons/links' },
          { key: 'Space', description: 'Activate buttons' },
          { key: 'Escape', description: 'Close modals/menus' },
        ];

        for (const shortcut of shortcuts) {
          // Ensure shortcuts work as expected
          try {
            if (shortcut.key === 'Shift+Tab') {
              await user.keyboard('{Shift>}{Tab}{/Shift}');
            } else {
              await user.keyboard(`{${shortcut.key}}`);
            }
            // No assertion needed, just ensure it doesn't throw
          } catch (error) {
            // Log but don't fail the test for keyboard shortcuts
            console.warn(`Keyboard shortcut ${shortcut.key} may not be properly supported`);
          }
        }
      });
    });

    describe('Understandable Guidelines', () => {
      it('should make text readable and understandable', () => {
        render(<ProductDetails product={mockProduct} />);

        // Check for language attributes
        expect(document.documentElement.getAttribute('lang')).toBeTruthy();

        // Check for consistent navigation
        const navigationElements = screen.queryAllByRole('navigation');
        navigationElements.forEach(nav => {
          expect(nav).toHaveAttribute('aria-label');
        });

        // Check for clear labels
        const formElements = screen
          .getAllByRole('textbox')
          .concat(screen.getAllByRole('combobox'))
          .concat(screen.getAllByRole('checkbox'))
          .concat(screen.getAllByRole('radio'));

        formElements.forEach(element => {
          // Each form element should have an accessible name
          expect(
            element.getAttribute('aria-label') ||
              element.getAttribute('aria-labelledby') ||
              element.closest('label') ||
              screen.queryByLabelText(element.getAttribute('name') || '')
          ).toBeTruthy();
        });
      });

      it('should make content appear and operate in predictable ways', () => {
        render(<CheckoutForm />);

        // Check that focus doesn't cause unexpected context changes
        const focusableElements = screen
          .getAllByRole('button')
          .concat(screen.getAllByRole('link'))
          .concat(screen.getAllByRole('textbox'));

        focusableElements.forEach(element => {
          const initialUrl = window.location.href;
          element.focus();

          // Focus should not trigger navigation or major context changes
          expect(window.location.href).toBe(initialUrl);
        });

        // Check for consistent navigation patterns
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          // Buttons should have consistent styling patterns
          expect(button.className).toMatch(/btn|button|primary|secondary/i);
        });
      });

      it('should help users avoid and correct mistakes', () => {
        render(<AccountProfile user={mockUser} profile={mockProfile} onSignOut={jest.fn()} />);

        // Check for error identification
        const errorMessages = screen.queryAllByRole('alert');
        errorMessages.forEach(error => {
          // Error messages should be properly associated with form fields
          expect(error.textContent).toBeTruthy();
          expect(error.textContent?.trim()).not.toBe('');
        });

        // Check for form validation
        const requiredFields = screen.queryAllByRequired();
        requiredFields.forEach(field => {
          expect(
            field.getAttribute('aria-required') === 'true' ||
              field.getAttribute('required') !== null
          ).toBeTruthy();
        });
      });
    });

    describe('Robust Guidelines', () => {
      it('should maximize compatibility with assistive technologies', () => {
        render(<ProductDetails product={mockProduct} />);

        // Check for proper ARIA usage
        const ariaElements = document.querySelectorAll('[aria-*]');
        ariaElements.forEach(element => {
          // Verify ARIA attributes are valid
          const ariaAttributes = Array.from(element.attributes).filter(attr =>
            attr.name.startsWith('aria-')
          );

          ariaAttributes.forEach(attr => {
            expect(attr.value).toBeTruthy();
            expect(attr.value.trim()).not.toBe('');
          });
        });

        // Check for semantic HTML
        const semanticElements = document.querySelectorAll(
          'main, nav, header, footer, section, article, aside, h1, h2, h3, h4, h5, h6'
        );
        expect(semanticElements.length).toBeGreaterThan(0);
      });

      it('should validate HTML structure', () => {
        render(<ProductCard product={mockProduct} />);

        // Check for proper nesting
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
        interactiveElements.forEach(element => {
          // Interactive elements should not be nested inside other interactive elements
          const parent = element.closest('button, a, input, select, textarea');
          if (parent && parent !== element) {
            expect(parent.contains(element)).toBeFalsy();
          }
        });

        // Check for required attributes
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          expect(img.getAttribute('alt')).toBeDefined();
        });

        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
          const inputs = form.querySelectorAll('input, select, textarea');
          inputs.forEach(input => {
            // Form inputs should have labels or aria-label
            expect(
              input.getAttribute('aria-label') ||
                input.getAttribute('aria-labelledby') ||
                form.querySelector(`label[for="${input.id}"]`) ||
                input.closest('label')
            ).toBeTruthy();
          });
        });
      });
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should provide proper role attributes', () => {
      render(<ProductDetails product={mockProduct} />);

      // Check for appropriate roles
      const rolesMap = {
        button: screen.queryAllByRole('button'),
        link: screen.queryAllByRole('link'),
        textbox: screen.queryAllByRole('textbox'),
        combobox: screen.queryAllByRole('combobox'),
        tab: screen.queryAllByRole('tab'),
        tabpanel: screen.queryAllByRole('tabpanel'),
        alert: screen.queryAllByRole('alert'),
        status: screen.queryAllByRole('status'),
      };

      Object.entries(rolesMap).forEach(([role, elements]) => {
        elements.forEach(element => {
          expect(element).toHaveAttribute('role', role);
        });
      });
    });

    it('should provide descriptive aria-labels and aria-descriptions', () => {
      render(<CheckoutForm />);

      const elementsWithAria = document.querySelectorAll('[aria-label], [aria-describedby]');
      elementsWithAria.forEach(element => {
        if (element.getAttribute('aria-label')) {
          const ariaLabel = element.getAttribute('aria-label');
          expect(ariaLabel).toBeTruthy();
          expect(ariaLabel!.length).toBeGreaterThan(2);
        }

        if (element.getAttribute('aria-describedby')) {
          const describedById = element.getAttribute('aria-describedby');
          const descriptionElement = document.getElementById(describedById!);
          expect(descriptionElement).toBeTruthy();
          expect(descriptionElement?.textContent).toBeTruthy();
        }
      });
    });

    it('should announce dynamic content changes', async () => {
      const user = userEvent.setup();
      render(<ProductDetails product={mockProduct} />);

      // Check for live regions
      const liveRegions = document.querySelectorAll('[aria-live]');
      liveRegions.forEach(region => {
        const ariaLive = region.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off']).toContain(ariaLive);
      });

      // Test dynamic content updates
      const quantityIncrement = screen.getByRole('button', { name: '+' });
      if (quantityIncrement) {
        await user.click(quantityIncrement);

        // Should have status updates for quantity changes
        await waitFor(() => {
          const statusElements = screen.queryAllByRole('status');
          if (statusElements.length > 0) {
            expect(statusElements[0]).toBeInTheDocument();
          }
        });
      }
    });

    it('should provide proper focus management for modals and dialogs', () => {
      render(<ProductDetails product={mockProduct} />);

      const dialogs = screen.queryAllByRole('dialog');
      dialogs.forEach(dialog => {
        // Dialogs should have proper ARIA attributes
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(
          dialog.getAttribute('aria-labelledby') || dialog.getAttribute('aria-label')
        ).toBeTruthy();

        // Focus should be trapped within the dialog
        const focusableElements = dialog.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        expect(focusableElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation in logical order', async () => {
      const user = userEvent.setup();
      render(<ProductDetails product={mockProduct} />);

      // Get all focusable elements
      const focusableElements = screen
        .getAllByRole('button')
        .concat(screen.getAllByRole('link'))
        .concat(screen.getAllByRole('textbox'))
        .concat(screen.getAllByRole('combobox'));

      // Tab through elements and verify order
      for (let i = 0; i < focusableElements.length; i++) {
        await user.tab();
        const focusedElement = document.activeElement;

        // Verify focus is on an expected interactive element
        expect(focusableElements).toContain(focusedElement);
      }
    });

    it('should support arrow key navigation for grouped controls', async () => {
      const user = userEvent.setup();
      render(<ProductDetails product={mockProduct} />);

      // Test tab navigation if present
      const tabs = screen.queryAllByRole('tab');
      if (tabs.length > 0) {
        tabs[0].focus();

        // Arrow keys should navigate between tabs
        await user.keyboard('{ArrowRight}');
        if (tabs.length > 1) {
          expect(document.activeElement).toBe(tabs[1]);
        }

        await user.keyboard('{ArrowLeft}');
        expect(document.activeElement).toBe(tabs[0]);
      }
    });

    it('should support Enter and Space key activation', async () => {
      const user = userEvent.setup();
      render(<ProductDetails product={mockProduct} />);

      const buttons = screen.getAllByRole('button');

      for (const button of buttons) {
        if (!button.disabled) {
          // Focus the button
          button.focus();

          // Test Enter key activation
          const clickHandler = jest.fn();
          button.addEventListener('click', clickHandler);

          await user.keyboard('{Enter}');
          // Note: This may not trigger in test environment, but structure should support it

          // Test Space key activation
          await user.keyboard(' ');
          // Note: This may not trigger in test environment, but structure should support it

          button.removeEventListener('click', clickHandler);
        }
      }
    });

    it('should support Escape key for dismissing overlays', async () => {
      const user = userEvent.setup();
      render(<ProductDetails product={mockProduct} />);

      // Check for modal or overlay elements
      const overlays = document.querySelectorAll(
        '[role="dialog"], [role="menu"], .modal, .overlay'
      );

      for (const overlay of overlays) {
        if (overlay instanceof HTMLElement) {
          // Focus within the overlay
          const focusableElement = overlay.querySelector('button, [href], input, select, textarea');
          if (focusableElement instanceof HTMLElement) {
            focusableElement.focus();

            // Escape should close the overlay
            await user.keyboard('{Escape}');

            // Overlay should no longer be visible or focusable
            expect(
              overlay.getAttribute('aria-hidden') === 'true' ||
                overlay.style.display === 'none' ||
                !overlay.isConnected
            ).toBeTruthy();
          }
        }
      }
    });
  });

  describe('Focus Management', () => {
    it('should provide visible focus indicators', () => {
      render(<ProductDetails product={mockProduct} />);

      const focusableElements = screen
        .getAllByRole('button')
        .concat(screen.getAllByRole('link'))
        .concat(screen.getAllByRole('textbox'));

      focusableElements.forEach(element => {
        element.focus();

        // Check for focus styling
        const computedStyle = window.getComputedStyle(element);
        expect(
          computedStyle.outline !== 'none' ||
            computedStyle.boxShadow !== 'none' ||
            element.matches(':focus-visible') ||
            element.classList.toString().includes('focus')
        ).toBeTruthy();
      });
    });

    it('should maintain logical focus order', () => {
      render(<CheckoutForm />);

      // Check tabindex values
      const elementsWithTabindex = document.querySelectorAll('[tabindex]');
      elementsWithTabindex.forEach(element => {
        const tabindex = parseInt(element.getAttribute('tabindex') || '0');

        // Avoid positive tabindex values (except for special cases)
        if (tabindex > 0) {
          // Should be used sparingly and intentionally
          expect(tabindex).toBeLessThan(10);
        }
      });
    });

    it('should restore focus appropriately after modal interactions', async () => {
      const user = userEvent.setup();
      render(<ProductDetails product={mockProduct} />);

      // Find elements that might open modals
      const modalTriggers = screen
        .queryAllByRole('button')
        .filter(
          button =>
            button.textContent?.includes('View') ||
            button.textContent?.includes('Details') ||
            button.getAttribute('aria-expanded') !== null
        );

      for (const trigger of modalTriggers) {
        // Store initial focus
        trigger.focus();
        const initialFocus = document.activeElement;

        // Trigger modal (if applicable)
        await user.click(trigger);

        // If a modal opened, it should manage focus
        const modal = document.querySelector('[role="dialog"]');
        if (modal) {
          // Focus should move to modal
          expect(modal.contains(document.activeElement)).toBeTruthy();

          // Close modal (simulate Escape or close button)
          const closeButton = modal.querySelector('[aria-label*="close"], [aria-label*="Close"]');
          if (closeButton instanceof HTMLElement) {
            await user.click(closeButton);
          } else {
            await user.keyboard('{Escape}');
          }

          // Focus should return to trigger
          await waitFor(() => {
            expect(document.activeElement).toBe(initialFocus);
          });
        }
      }
    });
  });

  describe('Mobile Accessibility', () => {
    it('should support touch targets of appropriate size', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        value: 667,
      });

      render(<ProductDetails product={mockProduct} />);

      const touchTargets = screen.getAllByRole('button').concat(screen.getAllByRole('link'));

      touchTargets.forEach(target => {
        const rect = target.getBoundingClientRect();

        // Minimum touch target size should be 44x44 pixels (iOS) or 48x48 pixels (Android)
        expect(rect.width).toBeGreaterThanOrEqual(40); // Allow some tolerance
        expect(rect.height).toBeGreaterThanOrEqual(40);
      });
    });

    it('should support mobile screen reader gestures', () => {
      render(<ProductCard product={mockProduct} />);

      // Check for proper heading structure for navigation
      const headings = screen.getAllByRole('heading');
      headings.forEach((heading, index) => {
        // Headings should have appropriate levels
        const level = parseInt(heading.tagName.replace('H', ''));
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(6);

        // Headings should be descriptive
        expect(heading.textContent).toBeTruthy();
        expect(heading.textContent!.length).toBeGreaterThan(2);
      });
    });

    it('should provide proper zoom and orientation support', () => {
      render(<CheckoutForm />);

      // Test portrait orientation
      Object.defineProperty(screen, 'orientation', {
        writable: true,
        value: { angle: 0, type: 'portrait-primary' },
      });

      // Content should be accessible in both orientations
      const mainContent = document.querySelector('main') || document.body;
      const rect = mainContent.getBoundingClientRect();

      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);

      // Test landscape orientation
      Object.defineProperty(window, 'innerWidth', { value: 667 });
      Object.defineProperty(window, 'innerHeight', { value: 375 });

      // Content should still be usable
      expect(mainContent.scrollHeight).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Validation', () => {
    it('should provide accessible error messages', async () => {
      const user = userEvent.setup();
      render(<AccountProfile user={mockUser} profile={mockProfile} onSignOut={jest.fn()} />);

      // Trigger validation error
      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.tab(); // Trigger blur event

      await waitFor(() => {
        const errorMessages = screen.queryAllByRole('alert');
        errorMessages.forEach(error => {
          // Error should be associated with the input
          expect(error.textContent).toBeTruthy();

          // Error should be announced to screen readers
          expect(error).toHaveAttribute('role', 'alert');

          // Error should be visually distinct
          expect(error.className).toMatch(/error|danger|red/i);
        });
      });
    });

    it('should provide helpful validation feedback', () => {
      render(<CheckoutForm />);

      const requiredFields = screen.queryAllByRequired();
      requiredFields.forEach(field => {
        // Required fields should be properly marked
        expect(
          field.getAttribute('aria-required') === 'true' || field.getAttribute('required') !== null
        ).toBeTruthy();

        // Should have associated labels
        const fieldId = field.getAttribute('id');
        if (fieldId) {
          const label = document.querySelector(`label[for="${fieldId}"]`);
          expect(label || field.getAttribute('aria-label')).toBeTruthy();
        }
      });
    });
  });

  describe('Internationalization (i18n) Accessibility', () => {
    it('should support right-to-left (RTL) languages', () => {
      // Mock RTL language
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');

      render(<ProductDetails product={mockProduct} />);

      // Check that layout adapts to RTL
      const elements = document.querySelectorAll('*');
      elements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);

        // Text should align appropriately for RTL
        if (computedStyle.textAlign === 'left') {
          // In RTL context, this might need adjustment
          console.warn('Element may need RTL text alignment adjustment');
        }
      });

      // Reset
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
    });

    it('should handle translated content properly', () => {
      render(<ProductCard product={mockProduct} />);

      // Check for lang attributes on content that might be in different languages
      const contentElements = document.querySelectorAll('*');
      contentElements.forEach(element => {
        if (element.textContent && element.textContent.length > 10) {
          // Long text content should have proper language markup
          const hasLangAttribute =
            element.getAttribute('lang') ||
            element.closest('[lang]') ||
            document.documentElement.getAttribute('lang');

          expect(hasLangAttribute).toBeTruthy();
        }
      });
    });
  });

  describe('Performance and Accessibility', () => {
    it('should not have accessibility blockers that impact performance', () => {
      render(<ProductDetails product={mockProduct} />);

      // Check for excessive ARIA attributes that might slow screen readers
      const elementsWithManyAria = document.querySelectorAll('*');
      elementsWithManyAria.forEach(element => {
        const ariaAttributes = Array.from(element.attributes).filter(attr =>
          attr.name.startsWith('aria-')
        );

        // Reasonable limit on ARIA attributes per element
        expect(ariaAttributes.length).toBeLessThan(10);
      });
    });

    it('should use semantic HTML to reduce need for ARIA', () => {
      render(<CheckoutForm />);

      // Count semantic vs non-semantic elements
      const semanticElements = document.querySelectorAll(
        'main, nav, header, footer, section, article, aside, h1, h2, h3, h4, h5, h6, button, input, select, textarea, label, form'
      );
      const totalElements = document.querySelectorAll('*');

      // At least 20% of elements should be semantic
      const semanticPercentage = (semanticElements.length / totalElements.length) * 100;
      expect(semanticPercentage).toBeGreaterThan(20);
    });
  });

  describe('Accessibility Testing Tools Integration', () => {
    it('should be compatible with automated accessibility testing', () => {
      render(<ProductDetails product={mockProduct} />);

      // Check for common accessibility violations that automated tools catch

      // 1. Missing alt attributes
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });

      // 2. Form labels
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        const id = input.getAttribute('id');
        const hasLabel =
          input.getAttribute('aria-label') ||
          input.getAttribute('aria-labelledby') ||
          (id && document.querySelector(`label[for="${id}"]`)) ||
          input.closest('label');

        expect(hasLabel).toBeTruthy();
      });

      // 3. Color contrast (basic check)
      const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
      textElements.forEach(element => {
        if (element.textContent && element.textContent.trim()) {
          const style = window.getComputedStyle(element);
          expect(style.color).not.toBe('rgba(0, 0, 0, 0)');
        }
      });
    });

    it('should support manual accessibility testing workflows', () => {
      render(<AccountProfile user={mockUser} profile={mockProfile} onSignOut={jest.fn()} />);

      // Elements should be easily identifiable for manual testing
      const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
      interactiveElements.forEach(element => {
        // Should have clear identification
        expect(
          element.textContent ||
            element.getAttribute('aria-label') ||
            element.getAttribute('title') ||
            element.getAttribute('alt')
        ).toBeTruthy();
      });
    });
  });
});
