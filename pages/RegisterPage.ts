import { Page, Locator } from '@playwright/test';
import { AccountPage } from './AccountPage';

export type RegistrationData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  telephone?: string;
};

export class RegisterPage {
  private readonly page: Page;

  // Locators
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly telephoneInput: Locator;
  private readonly passwordInput: Locator;
  private readonly passwordConfirmInput: Locator;
  private readonly privacyCheckbox: Locator;
  private readonly continueButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.getByPlaceholder('First Name');
    this.lastNameInput = page.getByPlaceholder('Last Name');
    this.emailInput = page.getByPlaceholder('E-Mail');
    this.telephoneInput = page.locator('#input-telephone');
    this.passwordInput = page.locator('#input-password');
    this.passwordConfirmInput = page.locator('#input-confirm');
    this.privacyCheckbox = page.locator('input[type="checkbox"]').last();
    this.continueButton = page.getByRole('button', { name: 'Continue' });
  }

  /** Verifies the registration page is displayed. */
  async isRegisterPageExists(): Promise<boolean> {
    try {
      await this.page.getByRole('heading', { name: 'Register Account' }).waitFor({ state: 'visible' });
      return true;
    } catch {
      return false;
    }
  }

  /** Completes the fields rendered by this OpenCart installation. */
  async register(data: RegistrationData): Promise<AccountPage> {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    await this.telephoneInput.fill(data.telephone ?? '123456789');
    await this.passwordInput.fill(data.password);
    await this.passwordConfirmInput.fill(data.password);
    await this.privacyCheckbox.check();
    await this.continueButton.click();
    return new AccountPage(this.page);
  }

  /** Verifies the account-created confirmation. */
  async hasAccountCreatedMessage(): Promise<boolean> {
    try {
      await this.page.getByText('Your Account Has Been Created!', { exact: true }).first().waitFor({ state: 'visible' });
      return true;
    } catch {
      return false;
    }
  }
}