// Manual mock for @prisma/client/runtime/library
module.exports = {
  PrismaClientKnownRequestError: class extends Error {
    constructor(message, { code, clientVersion }) {
      super(message);
      this.code = code;
      this.clientVersion = clientVersion;
      this.name = 'PrismaClientKnownRequestError';
    }
  },
};
