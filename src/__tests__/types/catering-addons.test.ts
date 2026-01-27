import { BOXED_LUNCH_ADD_ONS, AddOnOption } from '@/types/catering';

describe('Catering Add-Ons', () => {
  describe('BOXED_LUNCH_ADD_ONS', () => {
    it('should only contain BAMBOO_CUTLERY add-on', () => {
      const addOnKeys = Object.keys(BOXED_LUNCH_ADD_ONS);

      expect(addOnKeys).toHaveLength(1);
      expect(addOnKeys).toContain(AddOnOption.BAMBOO_CUTLERY);
    });

    it('should have correct BAMBOO_CUTLERY configuration', () => {
      const bambooCutlery = BOXED_LUNCH_ADD_ONS[AddOnOption.BAMBOO_CUTLERY];

      expect(bambooCutlery).toEqual({
        id: 'bamboo-cutlery',
        type: AddOnOption.BAMBOO_CUTLERY,
        name: 'Bamboo Cutlery Set',
        price: 1.5,
        description: 'Individually wrapped bamboo cutlery with napkin',
      });
    });

    it('should not contain INDIVIDUAL_SETUP add-on', () => {
      const addOnKeys = Object.keys(BOXED_LUNCH_ADD_ONS);

      expect(addOnKeys).not.toContain('INDIVIDUAL_SETUP');
    });
  });

  describe('AddOnOption enum', () => {
    it('should only have BAMBOO_CUTLERY option', () => {
      const enumValues = Object.values(AddOnOption);

      expect(enumValues).toHaveLength(1);
      expect(enumValues).toContain('BAMBOO_CUTLERY');
      expect(enumValues).not.toContain('INDIVIDUAL_SETUP');
    });
  });
});
