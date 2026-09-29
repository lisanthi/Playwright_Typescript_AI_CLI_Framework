import { Page, Locator } from '@playwright/test';

export class AdminCustomersPage {
  private readonly page: Page;
  private readonly emailFilter: Locator;
  private readonly filterButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailFilter = page.getByRole('textbox', { name: 'E-Mail' });
    this.filterButton = page.getByRole('button', { name: 'Filter' });
  }

  /** Opens the customer list from the administration dashboard. */
  async openCustomerList(): Promise<void> {
    const customersCard = this.page.getByText('Total Customers').locator('..');
    await customersCard.getByRole('link', { name: 'View more...' }).click();
    await this.page.getByRole('heading', { name: 'Customers' }).waitFor({ state: 'visible' });
  }

  /** Searches the customer list by email address. */
  async searchByEmail(email: string): Promise<void> {
    await this.emailFilter.fill(email);
    await this.filterButton.click();
    await this.page.getByRole('heading', { name: 'Customers' }).waitFor({ state: 'visible' });
  }

  /** Returns the table row containing the requested customer email. */
  customerRow(email: string): Locator {
    return this.page.locator('table tr').filter({ hasText: email }).first();
  }

  /** Verifies customer identity in the admin list. */
  async hasCustomer(email: string, firstName: string, lastName: string): Promise<boolean> {
    const row = this.customerRow(email);
    await row.waitFor({ state: 'visible' });
    const rowText = await row.innerText();
    const normalizedRowText = rowText.toLowerCase();
    return normalizedRowText.includes(firstName.toLowerCase()) &&
      normalizedRowText.includes(lastName.toLowerCase()) &&
      normalizedRowText.includes(email.toLowerCase());
  }
}