import dotenv from 'dotenv';
import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { AccountPage } from '../pages/AccountPage';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { AdminCustomersPage } from '../pages/AdminCustomersPage';

dotenv.config();

const APP_URL = process.env.WEB_APP_URL ?? 'http://localhost/opencart/upload/';

type PageFixtures = {
  homePage: HomePage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  accountPage: AccountPage;
  productPage: ProductPage;
  cartPage: CartPage;
  adminLoginPage: AdminLoginPage;
  adminCustomersPage: AdminCustomersPage;
};

export const test = base.extend<PageFixtures>({
  homePage: async ({ page }, use) => {
    await page.goto(APP_URL);
    await use(new HomePage(page));
  },
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  accountPage: async ({ page }, use) => use(new AccountPage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  adminLoginPage: async ({ page }, use) => use(new AdminLoginPage(page)),
  adminCustomersPage: async ({ page }, use) => use(new AdminCustomersPage(page)),
});

export { expect } from '@playwright/test';