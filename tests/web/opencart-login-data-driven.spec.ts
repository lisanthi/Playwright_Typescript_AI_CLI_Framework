import path from 'path';
import { test, expect } from '../../fixtures/pageFixtures';
import { DataProvider } from '../../utils/DataReader';

type LoginRow = {
  testName: string;
  email: string;
  password: string;
  expected: 'success' | 'failure';
};

const dataPath = path.resolve(__dirname, '../../testdata/opencart_logindata.json');
const loginRows = DataProvider.readJson(dataPath) as LoginRow[];

loginRows.forEach((row, index) => {
  test(`Data-driven login ${index + 1}: ${row.testName} @master  @web @datadriven`, async ({ homePage }) => {
    const loginPage = await homePage.clickLogin();
    const accountPage = await loginPage.login(row.email, row.password);

    if (row.expected === 'success') {
      await accountPage.isMyAccountPageExists(); 
    } else if (!row.email.trim() || !row.password.trim() || !row.email.includes('.')) {
      await expect(loginPage.isLoginPageExists()).resolves.toBeTruthy();
    } else {
      await expect(loginPage.hasInvalidLoginWarning()).resolves.toBeTruthy();
    }
  });
});