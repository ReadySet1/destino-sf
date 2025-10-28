import {
  isBusinessDay,
  getBusinessDaysAhead,
  getEarliestPickupDate,
  getEarliestDeliveryDate,
  getPickupTimeSlots,
  getDeliveryTimeSlots,
  isValidPickupDateTime,
  isValidDeliveryDateTime,
} from '../../lib/dateUtils';

describe.skip('DateUtils', () => {
  describe('Time Slot Generation', () => {
    describe('getPickupTimeSlots', () => {
      test('should return pickup time slots from 10:00 AM to 4:00 PM', () => {
        const slots = getPickupTimeSlots();

        expect(slots).toContain('10:00');
        expect(slots).toContain('12:00');
        expect(slots).toContain('16:00');
        expect(slots).not.toContain('09:00');
        expect(slots).not.toContain('17:00');
      });

      test('should return slots in hourly intervals', () => {
        const slots = getPickupTimeSlots();

        expect(slots).toContain('10:00');
        expect(slots).toContain('11:00');
        expect(slots).toContain('12:00');
        expect(slots).toContain('13:00');
        expect(slots).toContain('14:00');
        expect(slots).toContain('15:00');
        expect(slots).toContain('16:00');
        expect(slots).toHaveLength(7);
      });
    });

    describe('getDeliveryTimeSlots', () => {
      test('should return delivery time slots from 10:00 AM to 2:00 PM', () => {
        const slots = getDeliveryTimeSlots();

        expect(slots).toContain('10:00');
        expect(slots).toContain('12:00');
        expect(slots).toContain('14:00');
        expect(slots).not.toContain('09:00');
        expect(slots).not.toContain('15:00');
      });

      test('should have fewer slots than pickup (shorter window)', () => {
        const pickupSlots = getPickupTimeSlots();
        const deliverySlots = getDeliveryTimeSlots();

        expect(deliverySlots.length).toBeLessThan(pickupSlots.length);
        expect(deliverySlots).toHaveLength(5);
      });
    });
  });

  describe('Date Validation & Formatting', () => {
    describe('isBusinessDay', () => {
      test('should return true for weekdays (Monday-Friday)', () => {
        // Monday (Jan 1, 2024 is a Monday)
        const monday = new Date(2024, 0, 1);
        expect(isBusinessDay(monday)).toBe(true);

        // Wednesday
        const wednesday = new Date(2024, 0, 3);
        expect(isBusinessDay(wednesday)).toBe(true);

        // Friday
        const friday = new Date(2024, 0, 5);
        expect(isBusinessDay(friday)).toBe(true);
      });

      test('should return false for weekends', () => {
        // Saturday
        const saturday = new Date(2024, 0, 6);
        expect(isBusinessDay(saturday)).toBe(false);

        // Sunday
        const sunday = new Date(2024, 0, 7);
        expect(isBusinessDay(sunday)).toBe(false);
      });
    });

    describe('getBusinessDaysAhead', () => {
      test('should calculate business days correctly from Monday', () => {
        const monday = new Date(2024, 0, 1); // Jan 1, 2024 is Monday

        // 1 business day from Monday should be Tuesday
        const oneDayAhead = getBusinessDaysAhead(monday, 1);
        expect(oneDayAhead.getDay()).toBe(2); // Tuesday

        // 2 business days from Monday should be Wednesday
        const twoDaysAhead = getBusinessDaysAhead(monday, 2);
        expect(twoDaysAhead.getDay()).toBe(3); // Wednesday
      });

      test('should calculate business days correctly from Friday', () => {
        const friday = new Date(2024, 0, 5); // Jan 5, 2024 is Friday

        // 1 business day from Friday should be Monday
        const oneDayAhead = getBusinessDaysAhead(friday, 1);
        expect(oneDayAhead.getDay()).toBe(1); // Monday

        // 2 business days from Friday should be Tuesday
        const twoDaysAhead = getBusinessDaysAhead(friday, 2);
        expect(twoDaysAhead.getDay()).toBe(2); // Tuesday
      });

      test('should skip weekends when calculating business days', () => {
        const thursday = new Date(2024, 0, 4); // Jan 4, 2024 is Thursday

        // 3 business days from Thursday should skip the weekend and land on Tuesday
        const threeDaysAhead = getBusinessDaysAhead(thursday, 3);
        expect(threeDaysAhead.getDay()).toBe(2); // Tuesday
      });

      test('should handle zero business days', () => {
        const monday = new Date(2024, 0, 1);
        const sameDay = getBusinessDaysAhead(monday, 0);
        // Should return the start of the same day
        expect(sameDay.getDate()).toBe(monday.getDate());
        expect(sameDay.getMonth()).toBe(monday.getMonth());
        expect(sameDay.getFullYear()).toBe(monday.getFullYear());
      });
    });
  });

  describe('Business Logic Date Rules', () => {
    describe('Minimum advance notice for orders', () => {
      test('getEarliestPickupDate should provide 2 business days notice', () => {
        const earliestDate = getEarliestPickupDate();
        const today = new Date();

        // Should be at least 2 business days from today
        expect(earliestDate.getTime()).toBeGreaterThan(today.getTime());

        // Should be a business day
        expect(isBusinessDay(earliestDate)).toBe(true);
      });

      test('getEarliestDeliveryDate should provide 2 business days notice', () => {
        const earliestDate = getEarliestDeliveryDate();
        const today = new Date();

        // Should be at least 2 business days from today
        expect(earliestDate.getTime()).toBeGreaterThan(today.getTime());

        // Should be a business day
        expect(isBusinessDay(earliestDate)).toBe(true);
      });
    });

    describe('Delivery date validation', () => {
      describe('isValidPickupDateTime', () => {
        test('should reject pickup times outside business hours', () => {
          // Use a future business day
          const futureDate = getBusinessDaysAhead(new Date(), 5);
          const dateStr = futureDate.toISOString().split('T')[0];

          expect(isValidPickupDateTime(dateStr, '09:00')).toBe(false);
          expect(isValidPickupDateTime(dateStr, '17:00')).toBe(false);
          expect(isValidPickupDateTime(dateStr, '20:00')).toBe(false);
        });

        test('should accept valid pickup times', () => {
          // Use a future business day
          const futureDate = getBusinessDaysAhead(new Date(), 5);
          const dateStr = futureDate.toISOString().split('T')[0];

          expect(isValidPickupDateTime(dateStr, '10:00')).toBe(true);
          expect(isValidPickupDateTime(dateStr, '12:00')).toBe(true);
          expect(isValidPickupDateTime(dateStr, '16:00')).toBe(true);
        });

        test('should reject pickup dates with insufficient advance notice', () => {
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);

          const todayStr = today.toISOString().split('T')[0];
          const tomorrowStr = tomorrow.toISOString().split('T')[0];

          expect(isValidPickupDateTime(todayStr, '12:00')).toBe(false);
          expect(isValidPickupDateTime(tomorrowStr, '12:00')).toBe(false);
        });

        test('should reject weekend pickup dates', () => {
          // Find a future Saturday and Sunday
          let futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 10);

          // Find next Saturday
          while (futureDate.getDay() !== 6) {
            futureDate.setDate(futureDate.getDate() + 1);
          }
          const saturdayStr = futureDate.toISOString().split('T')[0];

          // Find next Sunday
          futureDate.setDate(futureDate.getDate() + 1);
          const sundayStr = futureDate.toISOString().split('T')[0];

          expect(isValidPickupDateTime(saturdayStr, '12:00')).toBe(false);
          expect(isValidPickupDateTime(sundayStr, '12:00')).toBe(false);
        });

        test('should handle invalid date/time formats', () => {
          expect(isValidPickupDateTime('invalid-date', '12:00')).toBe(false);
          expect(isValidPickupDateTime('2024-01-17', 'invalid-time')).toBe(false);
          expect(isValidPickupDateTime('2024-01-17', '25:00')).toBe(false);
        });
      });

      describe('isValidDeliveryDateTime', () => {
        test('should accept valid delivery times', () => {
          // Use a future business day
          const futureDate = getBusinessDaysAhead(new Date(), 5);
          const dateStr = futureDate.toISOString().split('T')[0];

          expect(isValidDeliveryDateTime(dateStr, '10:00')).toBe(true);
          expect(isValidDeliveryDateTime(dateStr, '12:00')).toBe(true);
          expect(isValidDeliveryDateTime(dateStr, '14:00')).toBe(true);
        });

        test('should reject delivery times outside business hours', () => {
          // Use a future business day
          const futureDate = getBusinessDaysAhead(new Date(), 5);
          const dateStr = futureDate.toISOString().split('T')[0];

          expect(isValidDeliveryDateTime(dateStr, '09:00')).toBe(false);
          expect(isValidDeliveryDateTime(dateStr, '15:00')).toBe(false);
          expect(isValidDeliveryDateTime(dateStr, '20:00')).toBe(false);
        });

        test('should reject delivery dates with insufficient advance notice', () => {
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);

          const todayStr = today.toISOString().split('T')[0];
          const tomorrowStr = tomorrow.toISOString().split('T')[0];

          expect(isValidDeliveryDateTime(todayStr, '12:00')).toBe(false);
          expect(isValidDeliveryDateTime(tomorrowStr, '12:00')).toBe(false);
        });

        test('should reject weekend delivery dates', () => {
          // Find a future Saturday and Sunday
          let futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 10);

          // Find next Saturday
          while (futureDate.getDay() !== 6) {
            futureDate.setDate(futureDate.getDate() + 1);
          }
          const saturdayStr = futureDate.toISOString().split('T')[0];

          // Find next Sunday
          futureDate.setDate(futureDate.getDate() + 1);
          const sundayStr = futureDate.toISOString().split('T')[0];

          expect(isValidDeliveryDateTime(saturdayStr, '12:00')).toBe(false);
          expect(isValidDeliveryDateTime(sundayStr, '12:00')).toBe(false);
        });
      });
    });

    describe('Holiday/weekend handling edge cases', () => {
      test('should handle business day calculation across multiple weeks', () => {
        const friday = new Date(2024, 0, 5); // Jan 5, 2024 is Friday

        // 5 business days from Friday should be the following Friday
        const fiveDaysAhead = getBusinessDaysAhead(friday, 5);
        expect(fiveDaysAhead.getDay()).toBe(5); // Friday
        expect(fiveDaysAhead.getDate()).toBe(12); // Jan 12
      });
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete pickup scheduling workflow', () => {
      const earliestDate = getEarliestPickupDate();
      const timeSlots = getPickupTimeSlots();

      // Should be a business day
      expect(isBusinessDay(earliestDate)).toBe(true);

      // Should have valid time slots
      expect(timeSlots.length).toBeGreaterThan(0);
      expect(timeSlots).toContain('12:00');

      // Should validate correctly for future dates
      const futureDate = getBusinessDaysAhead(new Date(), 5);
      const dateStr = futureDate.toISOString().split('T')[0];
      expect(isValidPickupDateTime(dateStr, '12:00')).toBe(true);
      expect(isValidPickupDateTime(dateStr, '09:00')).toBe(false);
    });

    test('should handle complete delivery scheduling workflow', () => {
      const earliestDate = getEarliestDeliveryDate();
      const timeSlots = getDeliveryTimeSlots();

      // Should be a business day
      expect(isBusinessDay(earliestDate)).toBe(true);

      // Should have valid time slots
      expect(timeSlots.length).toBeGreaterThan(0);
      expect(timeSlots).toContain('12:00');

      // Should validate correctly for future dates
      const futureDate = getBusinessDaysAhead(new Date(), 5);
      const dateStr = futureDate.toISOString().split('T')[0];
      expect(isValidDeliveryDateTime(dateStr, '12:00')).toBe(true);
      expect(isValidDeliveryDateTime(dateStr, '15:00')).toBe(false);
    });

    test('should enforce different time windows for pickup vs delivery', () => {
      // Use a future business day
      const futureDate = getBusinessDaysAhead(new Date(), 5);
      const dateStr = futureDate.toISOString().split('T')[0];

      // 15:00 (3 PM) should be valid for pickup but not delivery
      expect(isValidPickupDateTime(dateStr, '15:00')).toBe(true);
      expect(isValidDeliveryDateTime(dateStr, '15:00')).toBe(false);

      // 16:00 (4 PM) should be valid for pickup but not delivery
      expect(isValidPickupDateTime(dateStr, '16:00')).toBe(true);
      expect(isValidDeliveryDateTime(dateStr, '16:00')).toBe(false);

      // 12:00 (noon) should be valid for both
      expect(isValidPickupDateTime(dateStr, '12:00')).toBe(true);
      expect(isValidDeliveryDateTime(dateStr, '12:00')).toBe(true);
    });
  });
});
