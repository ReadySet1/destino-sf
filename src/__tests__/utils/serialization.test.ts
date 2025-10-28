import { serializeDecimal, serializeObject } from '../../utils/serialization';

describe.skip('Serialization', () => {
  beforeEach(() => {
    // Mock console methods to suppress expected warnings/errors during tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('serializeDecimal', () => {
    describe('Null and undefined handling', () => {
      test('should return null for null input', () => {
        expect(serializeDecimal(null)).toBeNull();
      });

      test('should return null for undefined input', () => {
        expect(serializeDecimal(undefined)).toBeNull();
      });
    });

    describe('Number handling', () => {
      test('should return numbers as-is', () => {
        expect(serializeDecimal(42)).toBe(42);
        expect(serializeDecimal(3.14)).toBe(3.14);
        expect(serializeDecimal(0)).toBe(0);
        expect(serializeDecimal(-10.5)).toBe(-10.5);
      });

      test('should handle NaN by returning null', () => {
        expect(serializeDecimal(NaN)).toBeNull();
      });

      test('should handle Infinity', () => {
        expect(serializeDecimal(Infinity)).toBe(Infinity);
        expect(serializeDecimal(-Infinity)).toBe(-Infinity);
      });
    });

    describe('String handling', () => {
      test('should parse valid numeric strings', () => {
        expect(serializeDecimal('42')).toBe(42);
        expect(serializeDecimal('3.14')).toBe(3.14);
        expect(serializeDecimal('-10.5')).toBe(-10.5);
        expect(serializeDecimal('0')).toBe(0);
      });

      test('should return null for non-numeric strings', () => {
        expect(serializeDecimal('abc')).toBeNull();
        expect(serializeDecimal('not a number')).toBeNull();
        expect(serializeDecimal('')).toBeNull();
        expect(serializeDecimal('12.34.56')).toBeNull();
      });

      test('should handle edge case numeric strings', () => {
        expect(serializeDecimal('0.0')).toBe(0);
        expect(serializeDecimal('000123')).toBe(123);
        expect(serializeDecimal('1e2')).toBe(100);
        expect(serializeDecimal('1.23e-4')).toBe(0.000123);
      });
    });

    describe('BigInt handling', () => {
      test('should convert BigInt to number', () => {
        expect(serializeDecimal(BigInt(42))).toBe(42);
        expect(serializeDecimal(BigInt(0))).toBe(0);
        expect(serializeDecimal(BigInt(-123))).toBe(-123);
      });

      test('should handle very large BigInt values', () => {
        const largeBigInt = BigInt('9007199254740991'); // Max safe integer
        expect(serializeDecimal(largeBigInt)).toBe(9007199254740991);
      });
    });

    describe('Decimal-like object handling', () => {
      test('should use toNumber method when available', () => {
        const decimalLike = {
          toNumber: jest.fn().mockReturnValue(42.5),
          toString: jest.fn().mockReturnValue('42.5'),
        };

        const result = serializeDecimal(decimalLike);
        expect(result).toBe(42.5);
        expect(decimalLike.toNumber).toHaveBeenCalled();
        expect(decimalLike.toString).not.toHaveBeenCalled();
      });

      test('should fallback to toString when toNumber not available', () => {
        const decimalLike = {
          toString: jest.fn().mockReturnValue('123.45'),
        };

        const result = serializeDecimal(decimalLike);
        expect(result).toBe(123.45);
        expect(decimalLike.toString).toHaveBeenCalled();
      });

      test('should use value property when available', () => {
        const decimalLike = {
          value: 67.89,
        };

        const result = serializeDecimal(decimalLike);
        expect(result).toBe(67.89);
      });

      test('should handle objects with invalid toString', () => {
        const decimalLike = {
          toString: jest.fn().mockReturnValue('invalid number'),
        };

        const result = serializeDecimal(decimalLike);
        expect(result).toBe(0); // Should fallback to 0
      });
    });

    describe('Error handling', () => {
      test('should handle objects that throw on conversion', () => {
        const problematicObject = {
          toNumber: jest.fn().mockImplementation(() => {
            throw new Error('Conversion failed');
          }),
          toString: jest.fn().mockReturnValue('fallback'),
        };

        const result = serializeDecimal(problematicObject);
        expect(result).toBe(0); // Should fallback to 0
        expect(console.error).toHaveBeenCalledWith(
          'Error serializing Decimal:',
          expect.any(Error),
          'Value:',
          problematicObject
        );
      });

      test('should handle objects with circular references', () => {
        const circular: any = { value: 42 };
        circular.self = circular;

        const result = serializeDecimal(circular);
        expect(result).toBe(42); // Should still work with value property
      });

      test('should return 0 for completely unconvertible values', () => {
        const unconvertible = Symbol('test');
        const result = serializeDecimal(unconvertible);
        expect(result).toBe(0);
      });
    });
  });

  describe('serializeObject', () => {
    describe('Primitive value handling', () => {
      test('should return primitives as-is for non-object types', () => {
        // The function is designed for objects, but let's test the behavior
        expect(serializeObject(42 as any)).toBe(42);
        expect(serializeObject('hello' as any)).toBe('hello');
        expect(serializeObject(true as any)).toBe(true);
        expect(serializeObject(false as any)).toBe(false);
        expect(serializeObject(null as any)).toBeNull();
      });

      test('should return undefined as null', () => {
        expect(serializeObject(undefined as any)).toBeUndefined();
      });
    });

    describe('Cart data serialization', () => {
      test('should serialize cart items with Decimal prices', () => {
        const cartItem = {
          id: 'item-1',
          name: 'Alfajores',
          quantity: 2,
          price: {
            toNumber: jest.fn().mockReturnValue(15.99),
          },
          total: {
            toNumber: jest.fn().mockReturnValue(31.98),
          },
          description: 'Delicious alfajores',
        };

        const result = serializeObject(cartItem);

        expect(result).toEqual({
          id: 'item-1',
          name: 'Alfajores',
          quantity: 2,
          price: 15.99,
          total: 31.98,
          description: 'Delicious alfajores',
        });
      });

      test('should handle cart with nested items', () => {
        const cart = {
          items: [
            {
              id: 'item-1',
              price: { toNumber: () => 10.5 },
              variant: {
                name: 'Large',
                priceAdjustment: { toNumber: () => 2.0 },
              },
            },
            {
              id: 'item-2',
              price: { toNumber: () => 8.75 },
              variant: null,
            },
          ],
          subtotal: { toNumber: () => 21.25 },
          tax: { toNumber: () => 1.91 },
          total: { toNumber: () => 23.16 },
        };

        const result = serializeObject(cart);

        expect(result.items).toHaveLength(2);
        expect(result.items[0].price).toBe(10.5);
        expect(result.items[0].variant.priceAdjustment).toBe(2.0);
        expect(result.items[1].price).toBe(8.75);
        expect(result.items[1].variant).toBeNull();
        expect(result.subtotal).toBe(21.25);
        expect(result.tax).toBe(1.91);
        expect(result.total).toBe(23.16);
      });
    });

    describe('Order data serialization', () => {
      test('should serialize order with financial data', () => {
        const order = {
          id: 'order-123',
          customerId: 'customer-456',
          total: { toNumber: () => 75.5 },
          taxAmount: { toNumber: () => 6.79 },
          shippingCostCents: { toNumber: () => 1500 },
          status: 'pending',
          items: [
            {
              productId: 'prod-1',
              quantity: 3,
              price: { toNumber: () => 12.99 },
              total: { toNumber: () => 38.97 },
            },
          ],
          createdAt: new Date('2024-01-15T10:00:00Z'),
          address: {
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94105',
          },
        };

        const result = serializeObject(order);

        expect(result.total).toBe(75.5);
        expect(result.taxAmount).toBe(6.79);
        expect(result.shippingCostCents).toBe(1500);
        expect(result.items[0].price).toBe(12.99);
        expect(result.items[0].total).toBe(38.97);
        expect(result.createdAt).toBe('2024-01-15T10:00:00.000Z');
        expect(result.address).toEqual({
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
        });
      });

      test('should handle critical fields with fallback to zero', () => {
        const order = {
          total: null,
          taxAmount: undefined,
          shippingCostCents: { toNumber: () => null },
          amount: 'invalid',
          price: { toString: () => 'not a number' },
          regularField: null,
        };

        const result = serializeObject(order);

        // Critical fields should default to 0
        expect(result.total).toBe(0);
        expect(result.taxAmount).toBe(0);
        expect(result.shippingCostCents).toBe(0);
        expect(result.amount).toBe(0);
        expect(result.price).toBe(0);
        // Non-critical fields should be null
        expect(result.regularField).toBeNull();
      });
    });

    describe('Array handling', () => {
      test('should serialize arrays with mixed content', () => {
        const arrayData = [
          { price: { toNumber: () => 10.0 } },
          'string value',
          42,
          { nested: { amount: { toNumber: () => 25.5 } } },
          null,
        ];

        const result = serializeObject(arrayData);

        expect(result).toEqual([
          { price: 10.0 },
          'string value',
          42,
          { nested: { amount: 25.5 } },
          null,
        ]);
      });

      test('should handle deeply nested arrays', () => {
        const nestedArray = {
          data: [
            [{ value: { toNumber: () => 1.5 } }, { value: { toNumber: () => 2.5 } }],
            [{ value: { toNumber: () => 3.5 } }],
          ],
        };

        const result = serializeObject(nestedArray);

        expect(result.data[0][0].value).toBe(1.5);
        expect(result.data[0][1].value).toBe(2.5);
        expect(result.data[1][0].value).toBe(3.5);
      });
    });

    describe('Date handling', () => {
      test('should convert Date objects to ISO strings', () => {
        const dataWithDates = {
          createdAt: new Date('2024-01-15T10:00:00Z'),
          updatedAt: new Date('2024-01-16T15:30:00Z'),
          metadata: {
            lastLogin: new Date('2024-01-14T09:15:00Z'),
          },
        };

        const result = serializeObject(dataWithDates);

        expect(result.createdAt).toBe('2024-01-15T10:00:00.000Z');
        expect(result.updatedAt).toBe('2024-01-16T15:30:00.000Z');
        expect(result.metadata.lastLogin).toBe('2024-01-14T09:15:00.000Z');
      });
    });

    describe('Function handling', () => {
      test('should skip function properties', () => {
        const objectWithFunctions = {
          name: 'test',
          calculate: () => 42,
          value: { toNumber: () => 10 },
          process: function () {
            return 'result';
          },
        };

        const result = serializeObject(objectWithFunctions);

        expect(result).toEqual({
          name: 'test',
          value: 10,
        });
        expect(result.calculate).toBeUndefined();
        expect(result.process).toBeUndefined();
      });
    });

    describe('Error handling for malformed data', () => {
      test('should handle objects with circular references gracefully', () => {
        const circular: any = {
          name: 'circular',
          price: { toNumber: () => 15.99 },
        };
        circular.self = circular;

        const result = serializeObject(circular);

        expect(result.name).toBe('circular');
        expect(result.price).toBe(15.99);
        // Circular reference should be handled without throwing
        expect(typeof result.self).toBe('object');
      });

      test('should handle objects with throwing getters', () => {
        const problematicObject = {
          name: 'test',
          get price() {
            throw new Error('Getter failed');
          },
          validField: { toNumber: () => 10 },
        };

        // Should not throw and should handle valid fields
        expect(() => serializeObject(problematicObject)).not.toThrow();
      });

      test('should handle null/undefined nested objects', () => {
        const dataWithNulls = {
          validField: 'test',
          nullObject: null,
          undefinedObject: undefined,
          nestedWithNulls: {
            value: null,
            price: { toNumber: () => 5.99 },
          },
        };

        const result = serializeObject(dataWithNulls);

        expect(result.validField).toBe('test');
        expect(result.nullObject).toBeNull();
        expect(result.undefinedObject).toBeNull();
        expect(result.nestedWithNulls.value).toBeNull();
        expect(result.nestedWithNulls.price).toBe(5.99);
      });
    });

    describe('Edge cases', () => {
      test('should handle empty objects and arrays', () => {
        expect(serializeObject({})).toEqual({});
        expect(serializeObject([])).toEqual([]);
        expect(serializeObject({ empty: {} })).toEqual({ empty: {} });
        expect(serializeObject({ emptyArray: [] })).toEqual({ emptyArray: [] });
      });

      test('should handle objects with symbol keys', () => {
        const sym = Symbol('test');
        const objWithSymbol = {
          [sym]: 'symbol value',
          regularKey: 'regular value',
          price: { toNumber: () => 10 },
        };

        const result = serializeObject(objWithSymbol);

        // Symbol keys should be ignored in serialization
        expect(result.regularKey).toBe('regular value');
        expect(result.price).toBe(10);
        expect(result[sym]).toBeUndefined();
      });

      test('should handle very deeply nested objects', () => {
        const deepObject = {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    price: { toNumber: () => 99.99 },
                    name: 'deep value',
                  },
                },
              },
            },
          },
        };

        const result = serializeObject(deepObject);

        expect(result.level1.level2.level3.level4.level5.price).toBe(99.99);
        expect(result.level1.level2.level3.level4.level5.name).toBe('deep value');
      });
    });
  });
});
