export const Resend = jest.fn().mockImplementation(() => ({
  emails: {
    send: jest.fn().mockResolvedValue({
      id: 'mock-email-id',
      from: 'test@example.com',
      to: ['recipient@example.com'],
      subject: 'Test Email',
    }),
    get: jest.fn().mockResolvedValue({
      id: 'mock-email-id',
      status: 'delivered',
    }),
    cancel: jest.fn().mockResolvedValue({
      id: 'mock-email-id',
      status: 'cancelled',
    }),
  },
  domains: {
    list: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'domain-123',
          name: 'destinosf.com',
          status: 'verified',
        },
      ],
    }),
    get: jest.fn().mockResolvedValue({
      id: 'domain-123',
      name: 'destinosf.com',
      status: 'verified',
    }),
    verify: jest.fn().mockResolvedValue({
      id: 'domain-123',
      status: 'verified',
    }),
  },
  apiKeys: {
    list: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'key-123',
          name: 'test-key',
        },
      ],
    }),
  },
}));

const resendMock = {
  Resend,
};

export default resendMock;
