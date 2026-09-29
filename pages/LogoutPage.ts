import { Page, Locator } from '@playwright/test';

export class LogoutPage {
  private readonly page: Page;
  private readonly continueLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.continueLink = page.getByRole('link', { name: 'Continue' });
  }

  /** Verifies the logout confirmation page is displayed. */
  async isLogoutPageExists(): Promise<boolean> {
    return this.page.getByRole('heading', { name: 'Account Logout' }).isVisible();
  }

  /** Returns to the storefront after logout. */
  async continueToHome(): Promise<void> {
    await this.continueLink.click();
  }
}