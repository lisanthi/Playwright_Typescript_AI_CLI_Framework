import { Page, Locator } from '@playwright/test';

export class ProductPage {
  private readonly page: Page;
  private readonly quantityInput: Locator;
  private readonly addToCartButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.quantityInput = page.locator('input[name="quantity"]');
    this.addToCartButton = page.getByRole('button', { name: 'Add to Cart' }).last();
  }

  /** Verifies the product detail page heading. */
  async isProductDisplayed(productName: string): Promise<boolean> {
    return this.page.getByRole('heading', { name: productName, level: 1 }).isVisible();
  }

  /** Sets the requested product quantity. */
  async setQuantity(quantity: number): Promise<void> {
    await this.quantityInput.fill(String(quantity));
  }

  /** Adds the product to the cart. */
  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }

  /** Verifies the product-added confirmation. */
  async hasAddedToCartMessage(): Promise<boolean> {
    try {
      await this.page.getByText(/Success: You have added .* to your shopping cart!/).waitFor({ state: 'visible' });
      return true;
    } catch {
      return false;
    }
  }

  /** Reads the displayed product price. */
  async getPrice(): Promise<string> {
    return (await this.page.getByRole('heading', { level: 2 }).first().textContent())?.trim() ?? '';
  }
}