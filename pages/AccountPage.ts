import { Page, Locator ,expect} from '@playwright/test';
import { LogoutPage } from './LogoutPage';

export class AccountPage {
  private readonly page: Page;
  private readonly accountHeading: Locator;
  private readonly logoutLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.accountHeading = page.getByRole('heading', { name: 'My Account' });
    this.logoutLink = page.getByRole('link', { name: 'Logout' });
  }

  /** Verifies the authenticated account area is displayed. */
  async isMyAccountPageExists(): Promise<void> {
    await expect(this.logoutLink).toBeVisible();
  }

  /** Logs out the current customer. */
  async logout(): Promise<LogoutPage> {
    await this.logoutLink.click();
    return new LogoutPage(this.page);
  }
}