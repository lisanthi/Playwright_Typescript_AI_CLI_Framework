import { Page, Locator } from '@playwright/test';

export class CartPage {
  private readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  /** Verifies the cart page is displayed. */
  async isCartPageExists(): Promise<boolean> {
    return this.page.getByRole('heading', { name: 'Shopping Cart' }).isVisible();
  }

  /** Verifies the expected product appears in the cart. */
  async hasProduct(productName: string): Promise<boolean> {
    try {
      await this.page.getByRole('link', { name: productName, exact: true }).last().waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /** Reads the cart row quantity. */
  async getQuantity(): Promise<string> {
    return (await this.page.locator('input[name^="quantity"]').first().inputValue()).trim();
  }

  /** Reads the cart row price or total text. */
  async getRowText(): Promise<string> {
    return (await this.page.locator('table tr').nth(1).textContent())?.trim() ?? '';
  }

  /** Reads the applicable cart total. */
  async getTotal(): Promise<string> {
    const totalRow = this.page.locator('table tr').filter({
      has: this.page.getByText('Total', { exact: true }),
    }).last();
    return (await totalRow.textContent())?.trim() ?? '';
  }
}