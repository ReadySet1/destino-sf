import {
  getDeliveryZone,
  calculateDeliveryFee,
  getDeliveryFeeMessage,
  DeliveryZone,
  DeliveryFeeResult,
} from '../../lib/deliveryUtils';
import { Address } from '../../types/address';

describe('DeliveryUtils', () => {
  describe('getDeliveryZone', () => {
    describe('Nearby zone cities', () => {
      test('should identify San Francisco as nearby zone', () => {
        expect(getDeliveryZone('San Francisco')).toBe(DeliveryZone.NEARBY);
        expect(getDeliveryZone('san francisco')).toBe(DeliveryZone.NEARBY);
        expect(getDeliveryZone('SAN FRANCISCO')).toBe(DeliveryZone.NEARBY);
      });

      test('should identify South San Francisco as nearby zone', () => {
        expect(getDeliveryZone('South San Francisco')).toBe(DeliveryZone.NEARBY);
        expect(getDeliveryZone('south san francisco')).toBe(DeliveryZone.NEARBY);
      });

      test('should identify San Mateo as nearby zone', () => {
        expect(getDeliveryZone('San Mateo')).toBe(DeliveryZone.NEARBY);
        expect(getDeliveryZone('san mateo')).toBe(DeliveryZone.NEARBY);
      });

      test('should identify other nearby cities correctly', () => {
        const nearbyCities = ['Daly City', 'Brisbane', 'Millbrae', 'Burlingame'];

        nearbyCities.forEach(city => {
          expect(getDeliveryZone(city)).toBe(DeliveryZone.NEARBY);
          expect(getDeliveryZone(city.toLowerCase())).toBe(DeliveryZone.NEARBY);
        });
      });
    });

    describe('Distant zone cities', () => {
      test('should identify San Jose area as distant zone', () => {
        const sanJoseArea = [
          'San Jose',
          'Santa Clara',
          'Sunnyvale',
          'Mountain View',
          'Palo Alto',
          'Menlo Park',
          'Redwood City',
          'San Carlos',
          'Belmont',
        ];

        sanJoseArea.forEach(city => {
          expect(getDeliveryZone(city)).toBe(DeliveryZone.DISTANT);
          expect(getDeliveryZone(city.toLowerCase())).toBe(DeliveryZone.DISTANT);
        });
      });

      test('should identify Marin County as distant zone', () => {
        const marinCities = [
          'Sausalito',
          'Mill Valley',
          'Tiburon',
          'Larkspur',
          'Corte Madera',
          'San Rafael',
          'Novato',
        ];

        marinCities.forEach(city => {
          expect(getDeliveryZone(city)).toBe(DeliveryZone.DISTANT);
          expect(getDeliveryZone(city.toLowerCase())).toBe(DeliveryZone.DISTANT);
        });
      });

      test('should identify East Bay/Oakland as distant zone', () => {
        const eastBayCities = [
          'Oakland',
          'Berkeley',
          'Alameda',
          'Emeryville',
          'San Leandro',
          'Hayward',
          'Richmond',
        ];

        eastBayCities.forEach(city => {
          expect(getDeliveryZone(city)).toBe(DeliveryZone.DISTANT);
          expect(getDeliveryZone(city.toLowerCase())).toBe(DeliveryZone.DISTANT);
        });
      });
    });

    describe('Case insensitivity and whitespace handling', () => {
      test('should handle mixed case correctly', () => {
        expect(getDeliveryZone('sAn FrAnCiScO')).toBe(DeliveryZone.NEARBY);
        expect(getDeliveryZone('OaKlAnD')).toBe(DeliveryZone.DISTANT);
      });

      test('should handle extra whitespace', () => {
        expect(getDeliveryZone('  San Francisco  ')).toBe(DeliveryZone.NEARBY);
        expect(getDeliveryZone(' Oakland ')).toBe(DeliveryZone.DISTANT);
      });
    });

    describe('Unsupported areas', () => {
      test('should return null for unsupported cities', () => {
        const unsupportedCities = [
          'Los Angeles',
          'San Diego',
          'Sacramento',
          'Fresno',
          'New York',
          'Seattle',
          'Portland',
          'Las Vegas',
          'Unknown City',
          '',
        ];

        unsupportedCities.forEach(city => {
          expect(getDeliveryZone(city)).toBeNull();
        });
      });
    });
  });

  describe('calculateDeliveryFee', () => {
    const createAddress = (city: string): Address => ({
      street: '123 Test St',
      city,
      state: 'CA',
      postalCode: '12345',
    });

    describe('Nearby zone fee calculation', () => {
      test('should charge fee for nearby zone with order < $75', () => {
        const address = createAddress('San Francisco');
        const result = calculateDeliveryFee(address, 50);

        expect(result).toEqual({
          zone: DeliveryZone.NEARBY,
          fee: 15,
          isFreeDelivery: false,
          minOrderForFreeDelivery: 75,
        });
      });

      test('should provide free delivery for nearby zone with order >= $75', () => {
        const address = createAddress('San Francisco');
        const result = calculateDeliveryFee(address, 75);

        expect(result).toEqual({
          zone: DeliveryZone.NEARBY,
          fee: 0,
          isFreeDelivery: true,
          minOrderForFreeDelivery: 75,
        });
      });

      test('should provide free delivery for nearby zone with order > $75', () => {
        const address = createAddress('Daly City');
        const result = calculateDeliveryFee(address, 100);

        expect(result).toEqual({
          zone: DeliveryZone.NEARBY,
          fee: 0,
          isFreeDelivery: true,
          minOrderForFreeDelivery: 75,
        });
      });

      test('should handle exact $75 order amount', () => {
        const address = createAddress('Burlingame');
        const result = calculateDeliveryFee(address, 75.0);

        expect(result).toEqual({
          zone: DeliveryZone.NEARBY,
          fee: 0,
          isFreeDelivery: true,
          minOrderForFreeDelivery: 75,
        });
      });
    });

    describe('Distant zone fee calculation', () => {
      test('should always charge fee for distant zone regardless of order amount', () => {
        const testCases = [
          { amount: 25, city: 'Oakland' },
          { amount: 50, city: 'San Jose' },
          { amount: 75, city: 'Berkeley' },
          { amount: 100, city: 'Sausalito' },
          { amount: 200, city: 'Palo Alto' },
        ];

        testCases.forEach(({ amount, city }) => {
          const address = createAddress(city);
          const result = calculateDeliveryFee(address, amount);

          expect(result).toEqual({
            zone: DeliveryZone.DISTANT,
            fee: 25,
            isFreeDelivery: false,
          });
        });
      });
    });

    describe('Invalid addresses', () => {
      test('should return null for unsupported cities', () => {
        const unsupportedAddresses = [
          createAddress('Los Angeles'),
          createAddress('Sacramento'),
          createAddress('Unknown City'),
          createAddress(''),
        ];

        unsupportedAddresses.forEach(address => {
          const result = calculateDeliveryFee(address, 100);
          expect(result).toBeNull();
        });
      });
    });

    describe('Edge cases', () => {
      test('should handle zero order amount', () => {
        const address = createAddress('San Francisco');
        const result = calculateDeliveryFee(address, 0);

        expect(result).toEqual({
          zone: DeliveryZone.NEARBY,
          fee: 15,
          isFreeDelivery: false,
          minOrderForFreeDelivery: 75,
        });
      });

      test('should handle negative order amount', () => {
        const address = createAddress('San Francisco');
        const result = calculateDeliveryFee(address, -10);

        expect(result).toEqual({
          zone: DeliveryZone.NEARBY,
          fee: 15,
          isFreeDelivery: false,
          minOrderForFreeDelivery: 75,
        });
      });

      test('should handle very large order amounts', () => {
        const address = createAddress('San Francisco');
        const result = calculateDeliveryFee(address, 999999);

        expect(result).toEqual({
          zone: DeliveryZone.NEARBY,
          fee: 0,
          isFreeDelivery: true,
          minOrderForFreeDelivery: 75,
        });
      });
    });
  });

  describe('getDeliveryFeeMessage', () => {
    describe('Free delivery messages', () => {
      test('should return correct message for free delivery in nearby zone', () => {
        const feeResult: DeliveryFeeResult = {
          zone: DeliveryZone.NEARBY,
          fee: 0,
          isFreeDelivery: true,
          minOrderForFreeDelivery: 75,
        };

        const message = getDeliveryFeeMessage(feeResult);
        expect(message).toBe('Free delivery for orders over $75!');
      });
    });

    describe('Paid delivery messages', () => {
      test('should return correct message for paid delivery in nearby zone', () => {
        const feeResult: DeliveryFeeResult = {
          zone: DeliveryZone.NEARBY,
          fee: 15,
          isFreeDelivery: false,
          minOrderForFreeDelivery: 75,
        };

        const message = getDeliveryFeeMessage(feeResult);
        expect(message).toBe('$15 delivery fee. Orders over $75 qualify for free delivery!');
      });

      test('should return correct message for distant zone delivery', () => {
        const feeResult: DeliveryFeeResult = {
          zone: DeliveryZone.DISTANT,
          fee: 25,
          isFreeDelivery: false,
        };

        const message = getDeliveryFeeMessage(feeResult);
        expect(message).toBe('$25 delivery fee for this area.');
      });
    });

    describe('Unsupported areas', () => {
      test('should return appropriate message for null fee result', () => {
        const message = getDeliveryFeeMessage(null);
        expect(message).toBe('This address is outside our delivery area.');
      });
    });

    describe('Edge cases', () => {
      test('should handle different fee amounts correctly', () => {
        const testCases = [
          {
            feeResult: {
              zone: DeliveryZone.DISTANT,
              fee: 30,
              isFreeDelivery: false,
            } as DeliveryFeeResult,
            expected: '$30 delivery fee for this area.',
          },
          {
            feeResult: {
              zone: DeliveryZone.NEARBY,
              fee: 20,
              isFreeDelivery: false,
              minOrderForFreeDelivery: 75,
            } as DeliveryFeeResult,
            expected: '$20 delivery fee. Orders over $75 qualify for free delivery!',
          },
        ];

        testCases.forEach(({ feeResult, expected }) => {
          const message = getDeliveryFeeMessage(feeResult);
          expect(message).toBe(expected);
        });
      });

      test('should handle different minimum order thresholds', () => {
        const feeResult: DeliveryFeeResult = {
          zone: DeliveryZone.NEARBY,
          fee: 15,
          isFreeDelivery: false,
          minOrderForFreeDelivery: 100,
        };

        const message = getDeliveryFeeMessage(feeResult);
        expect(message).toBe('$15 delivery fee. Orders over $100 qualify for free delivery!');
      });
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete delivery calculation workflow', () => {
      const address: Address = {
        street: '123 Market St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
      };

      // Test below threshold
      const result1 = calculateDeliveryFee(address, 50);
      expect(result1?.fee).toBe(15);
      expect(result1?.isFreeDelivery).toBe(false);
      expect(getDeliveryFeeMessage(result1)).toBe(
        '$15 delivery fee. Orders over $75 qualify for free delivery!'
      );

      // Test above threshold
      const result2 = calculateDeliveryFee(address, 80);
      expect(result2?.fee).toBe(0);
      expect(result2?.isFreeDelivery).toBe(true);
      expect(getDeliveryFeeMessage(result2)).toBe('Free delivery for orders over $75!');
    });

    test('should handle distant zone workflow', () => {
      const address: Address = {
        street: '456 University Ave',
        city: 'Palo Alto',
        state: 'CA',
        postalCode: '94301',
      };

      const result = calculateDeliveryFee(address, 100);
      expect(result?.fee).toBe(25);
      expect(result?.isFreeDelivery).toBe(false);
      expect(getDeliveryFeeMessage(result)).toBe('$25 delivery fee for this area.');
    });

    test('should handle unsupported area workflow', () => {
      const address: Address = {
        street: '789 Hollywood Blvd',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90028',
      };

      const result = calculateDeliveryFee(address, 100);
      expect(result).toBeNull();
      expect(getDeliveryFeeMessage(result)).toBe('This address is outside our delivery area.');
    });
  });
});
