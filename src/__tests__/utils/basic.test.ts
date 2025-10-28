describe.skip('Basic Jest Setup', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle basic string operations', () => {
    expect('hello').toEqual('hello');
    expect('hello').toContain('ell');
    expect('hello').toHaveLength(5);
  });
});
