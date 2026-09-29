import { Page, Locator } from '@playwright/test';
import { AdminCustomersPage } from './AdminCustomersPage';

export class AdminLoginPage {
  private readonly page: Page;

  // Locators
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly securityNotification: Locator;
  private readonly securityNotificationCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.securityNotification = page.locator('#modal-security');
    this.securityNotificationCloseButton = this.securityNotification.locator('button.btn-close');
  }

  /** Logs in to the OpenCart administration portal. */
  async login(username: string, password: string): Promise<AdminCustomersPage> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.getByRole('heading', { name: 'Dashboard' }).waitFor({ state: 'visible' });
    await this.dismissSecurityNotification();
    return new AdminCustomersPage(this.page);
  }

  /** Closes the optional security notification without changing its settings. */
  private async dismissSecurityNotification(): Promise<void> {
    if (await this.securityNotification.isVisible().catch(() => false)) {
      await this.securityNotificationCloseButton.click();
      await this.securityNotification.waitFor({ state: 'hidden' });
    }
  }
}