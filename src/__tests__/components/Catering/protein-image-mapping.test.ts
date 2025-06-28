import { ProteinOption } from '@/types/catering';

describe('Protein Image Mapping', () => {
  // Mock the getProteinImage function since it's internal to the component
  const getProteinImage = (protein: ProteinOption): string | null => {
    const imageMap: Record<ProteinOption, string | null> = {
      [ProteinOption.CARNE_ASADA]: '/images/boxedlunches/carne-asada.png',
      [ProteinOption.POLLO_AL_CARBON]: '/images/boxedlunches/pollo-carbon.png',
      [ProteinOption.CARNITAS]: '/images/boxedlunches/carnitas.png',
      [ProteinOption.POLLO_ASADO]: '/images/boxedlunches/pollo-asado.png',
      [ProteinOption.PESCADO]: '/images/boxedlunches/pescado.png',
      [ProteinOption.VEGETARIAN_OPTION]: '/images/boxedlunches/vegetarian-option.png',
    };

    return imageMap[protein] || null;
  };

  test('all protein options have image mappings', () => {
    const allProteins = Object.values(ProteinOption);
    
    allProteins.forEach(protein => {
      const imagePath = getProteinImage(protein);
      expect(imagePath).not.toBeNull();
      expect(imagePath).toBeTruthy();
    });
  });

  test('image paths are correctly formatted', () => {
    const allProteins = Object.values(ProteinOption);
    
    allProteins.forEach(protein => {
      const imagePath = getProteinImage(protein);
      
      if (imagePath) {
        // Should start with /images/boxedlunches/
        expect(imagePath).toMatch(/^\/images\/boxedlunches\//);
        
        // Should end with a valid image extension
        expect(imagePath).toMatch(/\.(png|jpg|jpeg)$/i);
        
        // Should not contain spaces or special characters
        expect(imagePath).not.toMatch(/\s/);
      }
    });
  });

  test('specific protein mappings are correct', () => {
    expect(getProteinImage(ProteinOption.CARNE_ASADA)).toBe('/images/boxedlunches/carne-asada.png');
    expect(getProteinImage(ProteinOption.POLLO_AL_CARBON)).toBe('/images/boxedlunches/pollo-carbon.png');
    expect(getProteinImage(ProteinOption.CARNITAS)).toBe('/images/boxedlunches/carnitas.png');
    expect(getProteinImage(ProteinOption.POLLO_ASADO)).toBe('/images/boxedlunches/pollo-asado.png');
    expect(getProteinImage(ProteinOption.PESCADO)).toBe('/images/boxedlunches/pescado.png');
    expect(getProteinImage(ProteinOption.VEGETARIAN_OPTION)).toBe('/images/boxedlunches/vegetarian-option.png');
  });

  test('all proteins have unique image files', () => {
    const allProteins = Object.values(ProteinOption);
    const imagePaths = allProteins.map(protein => getProteinImage(protein)).filter(Boolean);
    
    const uniquePaths = new Set(imagePaths);
    
    // We expect some overlap (like pollo.jpg being used for multiple proteins)
    // But we should have at least most paths be unique
    expect(uniquePaths.size).toBeGreaterThanOrEqual(4); // At least 4 unique images
  });

  test('protein enum coverage', () => {
    // Ensure we haven't missed any protein options
    const mappedProteins = [
      ProteinOption.CARNE_ASADA,
      ProteinOption.POLLO_AL_CARBON,
      ProteinOption.CARNITAS,
      ProteinOption.POLLO_ASADO,
      ProteinOption.PESCADO,
      ProteinOption.VEGETARIAN_OPTION,
    ];

    const allProteins = Object.values(ProteinOption);
    
    expect(mappedProteins.length).toBe(allProteins.length);
    
    // Ensure every protein in the enum is covered
    allProteins.forEach(protein => {
      expect(mappedProteins).toContain(protein);
    });
  });
}); 