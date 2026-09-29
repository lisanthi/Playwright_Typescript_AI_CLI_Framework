import { Page, Locator } from '@playwright/test';
import { AccountPage } from './AccountPage';

export class LoginPage {
  private readonly page: Page;

  // Locators
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly warning: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole('textbox', { name: 'E-Mail Address' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.warning = page.locator('.alert-danger');
  }

  /** Fills and submits customer credentials. */
  async login(email: string, password: string): Promise<AccountPage> {
    await this.emailInput.fill(email.trim());
    await this.passwordInput.fill(password.trim());
    await this.loginButton.click();
    return new AccountPage(this.page);
  }

  /** Verifies the login page is displayed. */
  async isLoginPageExists(): Promise<boolean> {
    return this.page.getByRole('heading', { name: 'Returning Customer' }).isVisible();
  }

  /** Verifies the standard OpenCart invalid-login warning. */
  async hasInvalidLoginWarning(): Promise<boolean> {
    try {
      await this.warning.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}