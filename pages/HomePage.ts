import { Page, Locator } from '@playwright/test';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { ProductPage } from './ProductPage';

export class HomePage {
  private readonly page: Page;

  // Locators
  private readonly myAccountMenu: Locator;
  private readonly searchBox: Locator;
  private readonly shoppingCartLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.myAccountMenu = page.getByRole('button', { name: 'My Account' });
    this.searchBox = page.getByRole('textbox', { name: 'Search' });
    this.shoppingCartLink = page.getByRole('link', { name: 'Shopping Cart', exact: true }).last();
  }

  /** Opens the My Account menu. */
  async openMyAccountMenu(): Promise<void> {
    await this.myAccountMenu.click();
  }

  /** Navigates to the registration page. */
  async clickRegister(): Promise<RegisterPage> {
    await this.openMyAccountMenu();
    await this.page.getByRole('link', { name: 'Register' }).click();
    return new RegisterPage(this.page);
  }

  /** Navigates to the login page. */
  async clickLogin(): Promise<LoginPage> {
    await this.openMyAccountMenu();
    await this.page.getByRole('link', { name: 'Login' }).click();
    await this.page.getByRole('heading', { name: 'Returning Customer' }).waitFor({ state: 'visible' });
    return new LoginPage(this.page);
  }

  /** Searches for a product by name. */
  async search(productName: string): Promise<void> {
    await this.searchBox.fill(productName);
    await this.searchBox.press('Enter');
    await this.page.waitForURL(/route=product\/search/);
  }

  /** Opens a product from the current results or featured list. */
  async openProduct(productName: string): Promise<ProductPage> {
    await this.page.getByRole('heading', { level: 4 }).getByRole('link', { name: productName, exact: true }).first().click();
    return new ProductPage(this.page);
  }

  /** Opens the shopping cart. */
  async openShoppingCart(): Promise<void> {
    await this.shoppingCartLink.click();
  }
}