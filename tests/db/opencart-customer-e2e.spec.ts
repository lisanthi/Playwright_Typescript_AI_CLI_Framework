import { test, expect } from '../../fixtures/pageFixtures';
import { RandomDataUtil } from '../../utils/dataGenerator';
import { executeQuery } from '../../utils/dbClient';

const ADMIN_URL = process.env.ADMIN_APP_URL ?? 'http://localhost/opencart/upload/admin/index.php';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin';

type CustomerRow = {
  firstname: string;
  lastname: string;
  email: string;
  status: number;
  date_added?: string;
};

test('Register customer and verify Admin and MySQL data @master @db @end-to-end', async ({
  homePage,
  adminLoginPage,
  page,
}) => {
  const registrationData = {
    firstName: RandomDataUtil.getFirstName(),
    lastName: RandomDataUtil.getLastName(),
    email: RandomDataUtil.getEmail(),
    password: RandomDataUtil.getPassword(12),
  };
  const normalizedEmail = registrationData.email.toLowerCase();

  const registerPage = await test.step('1) Register a unique customer through the storefront', async () => {
    const page = await homePage.clickRegister();
    expect(await page.isRegisterPageExists(), 'Registration page should be displayed').toBeTruthy();
    const accountPage = await page.register(registrationData);
    expect(await page.hasAccountCreatedMessage(), 'Account-created confirmation should be displayed').toBeTruthy();
    await accountPage.isMyAccountPageExists();
    return page;
  });

  await test.step('2) Verify the customer in the OpenCart Admin Portal', async () => {
    await page.goto(ADMIN_URL);
    const customersPage = await adminLoginPage.login(ADMIN_USERNAME, ADMIN_PASSWORD);
    await customersPage.openCustomerList();
    await customersPage.searchByEmail(normalizedEmail);
    expect(
    await customersPage.hasCustomer(normalizedEmail, registrationData.firstName, registrationData.lastName),
      'Admin customer row should contain the registered identity',
    ).toBeTruthy();
  });

  await test.step('3) Verify the customer in MySQL', async () => {
    const rows = await executeQuery(
      'SELECT firstname, lastname, email, status, date_added FROM oc_customer WHERE email = ?',
      [normalizedEmail],
    ) as CustomerRow[];

    expect(rows, 'Exactly one database customer row should be found').toHaveLength(1);
    expect(rows[0].firstname).toBe(registrationData.firstName);
    expect(rows[0].lastname).toBe(registrationData.lastName);
    expect(rows[0].email).toBe(normalizedEmail);
    expect(rows[0].status).toBe(1);
    expect(rows[0].date_added, 'date_added should be populated').toBeTruthy();
  });

  console.log(`Customer verification completed for ${registrationData.email}`);
});