import { test, expect } from '../../fixtures/pageFixtures';
import { RandomDataUtil } from '../../utils/dataGenerator';
import { Helper } from '../../utils/helper';

const PRODUCT_NAME = process.env.PRODUCT_NAME ?? 'MacBook';
const PRODUCT_QUANTITY = Number(process.env.PRODUCT_QUANTITY ?? 1);
const EXPECTED_PRICE = process.env.TOTAL_PRICE ?? '$602.00';

test('User registration flow @master @sanity', async ({ homePage }) => {
  const password = RandomDataUtil.getPassword(12);
  const registrationData = {
    firstName: RandomDataUtil.getFirstName(),
    lastName: RandomDataUtil.getLastName(),
    email: RandomDataUtil.getEmail(),
    password,
  };

  
  const registerPage = await homePage.clickRegister();
  await expect(registerPage.isRegisterPageExists()).resolves.toBeTruthy();
  const accountPage = await registerPage.register(registrationData);
  await expect(registerPage.hasAccountCreatedMessage()).resolves.toBeTruthy();
  await accountPage.isMyAccountPageExists(); 
});

test('Valid login flow @master @sanity', async ({ homePage }) => {
  const loginPage = await homePage.clickLogin();
  const { email, password } = Helper.getLoginDetails();
  await expect(loginPage.isLoginPageExists()).resolves.toBeTruthy();
  const accountPage = await loginPage.login(email, password);   
  await accountPage.isMyAccountPageExists(); 
  });

test('Invalid login flow @master @regression', async ({ homePage }) => {
  const loginPage = await homePage.clickLogin();
  const accountPage = await loginPage.login('invalid@example.com', 'invalid-password');
  await expect(loginPage.hasInvalidLoginWarning()).resolves.toBeTruthy();
   });

test('Logout flow @master @sanity', async ({ homePage, page }) => {
  const loginPage = await homePage.clickLogin();
  const { email, password } = Helper.getLoginDetails();
  const accountPage = await loginPage.login(email, password);
  await accountPage.isMyAccountPageExists(); 
  const logoutPage = await accountPage.logout();
  await expect(logoutPage.isLogoutPageExists()).resolves.toBeTruthy();
  await logoutPage.continueToHome();
  await expect(page.getByRole('button', { name: /item\(s\)/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'My Account' })).toBeVisible();
});

test('Product search flow @master @sanity', async ({ homePage, page }) => {
  await homePage.search(PRODUCT_NAME);
  await expect(page.getByRole('heading', { name: `Search - ${PRODUCT_NAME}` })).toBeVisible();
  await expect(page.getByRole('heading', { level: 4 }).getByRole('link', { name: PRODUCT_NAME, exact: true }).first()).toBeVisible();
});

test('Add product to cart @master @sanity', async ({ homePage, cartPage }) => {
  await homePage.search(PRODUCT_NAME);
  const productPage = await homePage.openProduct(PRODUCT_NAME);
  await expect(productPage.isProductDisplayed(PRODUCT_NAME)).resolves.toBeTruthy();
  await productPage.setQuantity(PRODUCT_QUANTITY);
  await productPage.addToCart();
  await expect(productPage.hasAddedToCartMessage()).resolves.toBeTruthy();
  await homePage.openShoppingCart();
  await expect(cartPage.isCartPageExists()).resolves.toBeTruthy();
  await expect(cartPage.hasProduct(PRODUCT_NAME)).resolves.toBeTruthy();
  await expect(cartPage.getQuantity()).resolves.toBe(String(PRODUCT_QUANTITY));
});

test('End-to-end shopping flow @master @end-to-end', async ({ homePage, cartPage }) => {
  const password = RandomDataUtil.getPassword(12);
  const registerPage = await homePage.clickRegister();
  const registrationData = {
    firstName: RandomDataUtil.getFirstName(),
    lastName: RandomDataUtil.getLastName(),
    email: RandomDataUtil.getEmail(),
    password,
  };
  const accountPage = await test.step('Register a new customer with dynamic data', () => registerPage.register(registrationData));
  await test.step('Verify successful registration', async () => {
    await expect(registerPage.hasAccountCreatedMessage()).resolves.toBeTruthy();
  });
  await test.step('Verify the account page is displayed after registration', () => accountPage.isMyAccountPageExists());
  const logoutPage = await test.step('Log out', () => accountPage.logout());
  await test.step('Return to the storefront', () => logoutPage.continueToHome());
  const loginPage = await test.step('Log in using the newly created credentials', () => homePage.clickLogin());
  const loggedInAccount = await test.step('Submit the new customer credentials', () => loginPage.login(registrationData.email, password));
  await test.step('Verify successful authentication', () => loggedInAccount.isMyAccountPageExists());
  await test.step('Search for the known product', () => homePage.search(PRODUCT_NAME));
  const productPage = await test.step('Open the product details page', () => homePage.openProduct(PRODUCT_NAME));
  await test.step('Set the product quantity', () => productPage.setQuantity(PRODUCT_QUANTITY));
  await test.step('Verify the product price', async () => {
    await expect(productPage.getPrice()).resolves.toBe(EXPECTED_PRICE);
  });
  await test.step('Add the product to the cart', () => productPage.addToCart());
  await test.step('Verify the product was added', async () => {
    await expect(productPage.hasAddedToCartMessage()).resolves.toBeTruthy();
  });
  await test.step('Open the shopping cart', () => homePage.openShoppingCart());
  await test.step('Verify the correct product is in the cart', async () => {
    await expect(cartPage.hasProduct(PRODUCT_NAME)).resolves.toBeTruthy();
  });
  await test.step('Verify the quantity', async () => {
    await expect(cartPage.getQuantity()).resolves.toBe(String(PRODUCT_QUANTITY));
  });
  await test.step('Verify the applicable cart total', async () => {
    await expect(cartPage.getTotal()).resolves.toContain(EXPECTED_PRICE);
  });
});