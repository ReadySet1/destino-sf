interface Window {
  Square?: {
    payments: (
      appId: string,
      locationId: string
    ) => {
      card: () => Promise<{
        attach: (selector: string) => Promise<void>;
        tokenize: () => Promise<{
          status: string;
          token?: string;
          errors?: Array<{ message: string }>;
        }>;
        destroy: () => void;
      }>;
    };
  };
}
