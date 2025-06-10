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

// Mock date-fns functions to control time-based tests
const mockDate = new Date('2024-01-15T10:00:00.000Z'); // Monday

describe('DateUtils', () => {
  beforeEach(() => {
    // Mock current date to Monday for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
    jest.spyOn(global, 'Date').mockImplementation((dateString?: string | number | Date) => {
      if (dateString) {
        return new Date(dateString) as any;
      }
      return mockDate as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Date Validation & Formatting', () => {
    describe('isBusinessDay', () => {
      test('should return true for weekdays (Monday-Friday)', () => {
        const businessDays = [
          new Date('2024-01-15'), // Monday
          new Date('2024-01-16'), // Tuesday  
          new Date('2024-01-17'), // Wednesday
          new Date('2024-01-18'), // Thursday
          new Date('2024-01-19'), // Friday
        ];

        businessDays.forEach(date => {
          expect(isBusinessDay(date)).toBe(true);
        });
      });

      test('should return false for weekends', () => {
        const weekendDays = [
          new Date('2024-01-13'), // Saturday
          new Date('2024-01-14'), // Sunday
          new Date('2024-01-20'), // Saturday
          new Date('2024-01-21'), // Sunday
        ];

        weekendDays.forEach(date => {
          expect(isBusinessDay(date)).toBe(false);
        });
      });
    });

    describe('getBusinessDaysAhead', () => {
      test('should calculate business days correctly from Monday', () => {
        const monday = new Date('2024-01-15'); // Monday
        
        // 1 business day ahead should be Tuesday
        const oneDayAhead = getBusinessDaysAhead(monday, 1);
        expect(oneDayAhead.getDay()).toBe(2); // Tuesday

        // 5 business days ahead should be Monday of next week
        const fiveDaysAhead = getBusinessDaysAhead(monday, 5);
        expect(fiveDaysAhead.getDay()).toBe(1); // Monday
        expect(fiveDaysAhead.getDate()).toBe(22); // Next Monday
      });

      test('should calculate business days correctly from Friday', () => {
        const friday = new Date('2024-01-19'); // Friday
        
        // 1 business day ahead should be Monday
        const oneDayAhead = getBusinessDaysAhead(friday, 1);
        expect(oneDayAhead.getDay()).toBe(1); // Monday
        expect(oneDayAhead.getDate()).toBe(22); // Next Monday

        // 3 business days ahead should be Wednesday
        const threeDaysAhead = getBusinessDaysAhead(friday, 3);
        expect(threeDaysAhead.getDay()).toBe(3); // Wednesday
        expect(threeDaysAhead.getDate()).toBe(24);
      });

      test('should skip weekends when calculating business days', () => {
        const thursday = new Date('2024-01-18'); // Thursday
        
        // 2 business days ahead should skip weekend and land on Monday
        const twoDaysAhead = getBusinessDaysAhead(thursday, 2);
        expect(twoDaysAhead.getDay()).toBe(1); // Monday
        expect(twoDaysAhead.getDate()).toBe(22);
      });

      test('should handle zero business days', () => {
        const monday = new Date('2024-01-15');
        const result = getBusinessDaysAhead(monday, 0);
        expect(result.getDate()).toBe(15); // Same day
      });
    });

    describe('Time slot generation', () => {
      test('getPickupTimeSlots should return hourly slots from 10:00 AM to 4:00 PM', () => {
        const slots = getPickupTimeSlots();
        const expectedSlots = [
          '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'
        ];
        
        expect(slots).toEqual(expectedSlots);
        expect(slots).toHaveLength(7);
      });

      test('getDeliveryTimeSlots should return hourly slots from 10:00 AM to 2:00 PM', () => {
        const slots = getDeliveryTimeSlots();
        const expectedSlots = [
          '10:00', '11:00', '12:00', '13:00', '14:00'
        ];
        
        expect(slots).toEqual(expectedSlots);
        expect(slots).toHaveLength(5);
      });
    });
  });

  describe('Business Logic Date Rules', () => {
    describe('Minimum advance notice for orders', () => {
      test('getEarliestPickupDate should provide 2 business days notice', () => {
        // If today is Monday (Jan 15), earliest pickup should be Wednesday (Jan 17)
        jest.spyOn(global, 'Date').mockImplementation(() => new Date('2024-01-15T10:00:00') as any);
        
        const earliestDate = getEarliestPickupDate();
        expect(earliestDate.getDay()).toBe(3); // Wednesday
        expect(earliestDate.getDate()).toBe(17);
      });

      test('getEarliestDeliveryDate should provide 2 business days notice', () => {
        // If today is Monday (Jan 15), earliest delivery should be Wednesday (Jan 17)
        jest.spyOn(global, 'Date').mockImplementation(() => new Date('2024-01-15T10:00:00') as any);
        
        const earliestDate = getEarliestDeliveryDate();
        expect(earliestDate.getDay()).toBe(3); // Wednesday
        expect(earliestDate.getDate()).toBe(17);
      });

      test('should handle advance notice from Friday correctly', () => {
        // If today is Friday (Jan 19), earliest should be Tuesday (Jan 23)
        jest.spyOn(global, 'Date').mockImplementation(() => new Date('2024-01-19T10:00:00') as any);
        
        const earliestPickup = getEarliestPickupDate();
        const earliestDelivery = getEarliestDeliveryDate();
        
        expect(earliestPickup.getDay()).toBe(2); // Tuesday
        expect(earliestPickup.getDate()).toBe(23);
        expect(earliestDelivery.getDay()).toBe(2); // Tuesday
        expect(earliestDelivery.getDate()).toBe(23);
      });
    });

    describe('Delivery date validation', () => {
      beforeEach(() => {
        jest.spyOn(global, 'Date').mockImplementation(() => new Date('2024-01-15T10:00:00') as any);
      });

      describe('isValidPickupDateTime', () => {
        test('should accept valid pickup date and time', () => {
          // Wednesday Jan 17 at 12:00 (2 business days from Monday Jan 15)
          expect(isValidPickupDateTime('2024-01-17', '12:00')).toBe(true);
          expect(isValidPickupDateTime('2024-01-17', '10:00')).toBe(true);
          expect(isValidPickupDateTime('2024-01-17', '16:00')).toBe(true);
        });

        test('should reject dates with insufficient notice', () => {
          // Tuesday Jan 16 (only 1 business day notice)
          expect(isValidPickupDateTime('2024-01-16', '12:00')).toBe(false);
          // Today (no notice)
          expect(isValidPickupDateTime('2024-01-15', '12:00')).toBe(false);
        });

        test('should reject weekend dates', () => {
          // Saturday Jan 20
          expect(isValidPickupDateTime('2024-01-20', '12:00')).toBe(false);
          // Sunday Jan 21
          expect(isValidPickupDateTime('2024-01-21', '12:00')).toBe(false);
        });

        test('should reject times outside business hours', () => {
          expect(isValidPickupDateTime('2024-01-17', '09:00')).toBe(false); // Too early
          expect(isValidPickupDateTime('2024-01-17', '17:00')).toBe(false); // Too late
          expect(isValidPickupDateTime('2024-01-17', '08:30')).toBe(false);
          expect(isValidPickupDateTime('2024-01-17', '18:00')).toBe(false);
        });

        test('should reject invalid time slots', () => {
          expect(isValidPickupDateTime('2024-01-17', '10:30')).toBe(false); // Not hourly
          expect(isValidPickupDateTime('2024-01-17', '12:15')).toBe(false); // Not hourly
          expect(isValidPickupDateTime('2024-01-17', 'invalid')).toBe(false); // Invalid format
        });

        test('should handle invalid date formats gracefully', () => {
          expect(isValidPickupDateTime('invalid-date', '12:00')).toBe(false);
          expect(isValidPickupDateTime('2024-13-45', '12:00')).toBe(false);
          expect(isValidPickupDateTime('', '12:00')).toBe(false);
          expect(isValidPickupDateTime('2024-01-17', '')).toBe(false);
        });
      });

      describe('isValidDeliveryDateTime', () => {
        test('should accept valid delivery date and time', () => {
          // Wednesday Jan 17 at 12:00 (2 business days from Monday Jan 15)
          expect(isValidDeliveryDateTime('2024-01-17', '12:00')).toBe(true);
          expect(isValidDeliveryDateTime('2024-01-17', '10:00')).toBe(true);
          expect(isValidDeliveryDateTime('2024-01-17', '14:00')).toBe(true);
        });

        test('should reject dates with insufficient notice', () => {
          // Tuesday Jan 16 (only 1 business day notice)
          expect(isValidDeliveryDateTime('2024-01-16', '12:00')).toBe(false);
          // Today (no notice)
          expect(isValidDeliveryDateTime('2024-01-15', '12:00')).toBe(false);
        });

        test('should reject weekend dates', () => {
          // Saturday Jan 20
          expect(isValidDeliveryDateTime('2024-01-20', '12:00')).toBe(false);
          // Sunday Jan 21
          expect(isValidDeliveryDateTime('2024-01-21', '12:00')).toBe(false);
        });

        test('should reject times outside delivery hours', () => {
          expect(isValidDeliveryDateTime('2024-01-17', '09:00')).toBe(false); // Too early
          expect(isValidDeliveryDateTime('2024-01-17', '15:00')).toBe(false); // Too late
          expect(isValidDeliveryDateTime('2024-01-17', '16:00')).toBe(false); // Too late
        });

        test('should reject invalid delivery time slots', () => {
          expect(isValidDeliveryDateTime('2024-01-17', '10:30')).toBe(false); // Not hourly
          expect(isValidDeliveryDateTime('2024-01-17', '12:15')).toBe(false); // Not hourly
        });

        test('should handle invalid date formats gracefully', () => {
          expect(isValidDeliveryDateTime('invalid-date', '12:00')).toBe(false);
          expect(isValidDeliveryDateTime('2024-13-45', '12:00')).toBe(false);
          expect(isValidDeliveryDateTime('', '12:00')).toBe(false);
          expect(isValidDeliveryDateTime('2024-01-17', '')).toBe(false);
        });
      });
    });

    describe('Holiday/weekend handling edge cases', () => {
      test('should handle business day calculation across multiple weeks', () => {
        const friday = new Date('2024-01-19'); // Friday
        
        // 10 business days should be 2 weeks + 2 days = Thursday Feb 1
        const tenDaysAhead = getBusinessDaysAhead(friday, 10);
        expect(tenDaysAhead.getDay()).toBe(4); // Thursday
        expect(tenDaysAhead.getDate()).toBe(1); // Feb 1
      });

      test('should handle minimum notice from different starting days', () => {
        const testCases = [
          { start: 'Monday', date: '2024-01-15', expectedDay: 3 }, // Wednesday
          { start: 'Tuesday', date: '2024-01-16', expectedDay: 4 }, // Thursday
          { start: 'Wednesday', date: '2024-01-17', expectedDay: 5 }, // Friday
          { start: 'Thursday', date: '2024-01-18', expectedDay: 1 }, // Monday (skip weekend)
          { start: 'Friday', date: '2024-01-19', expectedDay: 2 }, // Tuesday (skip weekend)
        ];

        testCases.forEach(({ start, date, expectedDay }) => {
          jest.spyOn(global, 'Date').mockImplementation(() => new Date(`${date}T10:00:00`) as any);
          
          const earliest = getEarliestPickupDate();
          expect(earliest.getDay()).toBe(expectedDay);
        });
      });
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete pickup scheduling workflow', () => {
      // Starting from Monday
      jest.spyOn(global, 'Date').mockImplementation(() => new Date('2024-01-15T10:00:00') as any);
      
      const earliestDate = getEarliestPickupDate();
      const timeSlots = getPickupTimeSlots();
      
      // Should be Wednesday
      expect(earliestDate.getDay()).toBe(3);
      
      // All time slots should be valid for the earliest date
      timeSlots.forEach(timeSlot => {
        const dateStr = earliestDate.toISOString().split('T')[0];
        expect(isValidPickupDateTime(dateStr, timeSlot)).toBe(true);
      });
    });

    test('should handle complete delivery scheduling workflow', () => {
      // Starting from Thursday
      jest.spyOn(global, 'Date').mockImplementation(() => new Date('2024-01-18T10:00:00') as any);
      
      const earliestDate = getEarliestDeliveryDate();
      const timeSlots = getDeliveryTimeSlots();
      
      // Should be Monday (skip weekend)
      expect(earliestDate.getDay()).toBe(1);
      
      // All time slots should be valid for the earliest date
      timeSlots.forEach(timeSlot => {
        const dateStr = earliestDate.toISOString().split('T')[0];
        expect(isValidDeliveryDateTime(dateStr, timeSlot)).toBe(true);
      });
    });

    test('should enforce different time windows for pickup vs delivery', () => {
      const date = '2024-01-17'; // Valid Wednesday
      
      // 15:00 (3 PM) should be valid for pickup but not delivery
      expect(isValidPickupDateTime(date, '15:00')).toBe(true);
      expect(isValidDeliveryDateTime(date, '15:00')).toBe(false);
      
      // 16:00 (4 PM) should be valid for pickup but not delivery
      expect(isValidPickupDateTime(date, '16:00')).toBe(true);
      expect(isValidDeliveryDateTime(date, '16:00')).toBe(false);
      
      // 14:00 (2 PM) should be valid for both
      expect(isValidPickupDateTime(date, '14:00')).toBe(true);
      expect(isValidDeliveryDateTime(date, '14:00')).toBe(true);
    });
  });
}); 