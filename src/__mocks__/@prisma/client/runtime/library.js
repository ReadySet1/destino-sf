// Manual mock for @prisma/client/runtime/library
class Decimal {
  constructor(value) {
    this.value = typeof value === 'string' ? parseFloat(value) : value;
  }

  toString() {
    return this.value.toString();
  }

  toNumber() {
    return this.value;
  }

  toFixed(decimals) {
    return this.value.toFixed(decimals);
  }

  equals(other) {
    return this.value === (other.value || other);
  }

  lessThan(other) {
    return this.value < (other.value || other);
  }

  greaterThan(other) {
    return this.value > (other.value || other);
  }

  add(other) {
    return new Decimal(this.value + (other.value || other));
  }

  sub(other) {
    return new Decimal(this.value - (other.value || other));
  }

  mul(other) {
    return new Decimal(this.value * (other.value || other));
  }

  div(other) {
    return new Decimal(this.value / (other.value || other));
  }
}

module.exports = {
  PrismaClientKnownRequestError: class extends Error {
    constructor(message, { code, clientVersion }) {
      super(message);
      this.code = code;
      this.clientVersion = clientVersion;
      this.name = 'PrismaClientKnownRequestError';
    }
  },
  Decimal,
};
