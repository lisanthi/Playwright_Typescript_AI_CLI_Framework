export class Helper {
  static convertPriceToNumber(price: string): number {
    const sanitizedPrice = price.replace(/[^0-9.]/g, '');
    return Number(sanitizedPrice);
  }

  static getProductDetails() {
    return {
      productName: 'MacBook',
      productQuantity: '1',
      totalPrice: '$602.00',
    };
  }

  static getLoginDetails() {
    return {
      email: 'Rajarani@xyz.com',
      password: 'test@456',
    };
  }
}
