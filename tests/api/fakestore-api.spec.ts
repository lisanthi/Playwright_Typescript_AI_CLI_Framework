import { test, expect, Page } from '@playwright/test';
import Ajv from 'ajv';
import dotenv from 'dotenv';
import path from 'path';
import { Routes } from '../../api/endpoints/routes';
import { RandomDataUtil } from '../../utils/dataGenerator';
import { DataProvider } from '../../utils/DataReader';

dotenv.config();

const BASE_URL = process.env.API_BASE_URL ?? Routes.BASE_URL;
const PRODUCT_ID = Number(process.env.PRODUCT_ID ?? 1);
const USER_ID = Number(process.env.USER_ID ?? 1);
const CART_ID = Number(process.env.CART_ID ?? 1);
const LIMIT = Number(process.env.LIMIT ?? 3);
const START_DATE = process.env.START_DATE ?? '2019-12-10';
const END_DATE = process.env.END_DATE ?? '2020-10-10';

type Product = { id: number; title: string; price: number; category: string; image: string; description?: string };
type User = { id: number; email: string; username: string; name?: Record<string, string>; [key: string]: unknown };
type Cart = { id: number; userId: number; date: string; products: { productId: number; quantity: number }[] };

const endpoint = (route: string): string => `${BASE_URL}${route}`;
const withId = (route: string, id: number): string => endpoint(route.replace('{id}', String(id)));
const withValue = (route: string, key: string, value: string | number): string => endpoint(route.replace(`{${key}}`, String(value)));

type BrowserApiResponse = {
  status(): number;
  json(): Promise<unknown>;
};

async function browserRequest(page: Page, method: string, url: string, data?: unknown): Promise<BrowserApiResponse> {
  const result = await page.evaluate(async ({ method, url, data }) => {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });

    return {
      status: response.status,
      text: await response.text(),
    };
  }, { method, url, data });

  return {
    status: () => result.status,
    json: async () => {
      try {
        return JSON.parse(result.text);
      } catch {
        return { message: result.text };
      }
    },
  };
}

function assertProduct(product: Product, expectedId?: number): void {
  expect(product.id).toBe(expectedId ?? product.id);
  expect(product.title).toEqual(expect.any(String));
  expect(product.price).toEqual(expect.any(Number));
  expect(product.category).toEqual(expect.any(String));
  expect(product.image).toEqual(expect.any(String));
}

function assertSorted(ids: number[], direction: 'asc' | 'desc'): void {
  const expected = [...ids].sort((first, second) => direction === 'asc' ? first - second : second - first);
  expect(ids).toEqual(expected);
}

test.describe('FakeStore Authentication API', () => {
  test('POST - Successful login @master @sanity', async ({ page }) => {
    const credentials = {
      username: 'mor_2314',
      password: '83r5^_',
    };

    const responseData = await page.evaluate(async ({ loginUrl, credentials }) => {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      return {
        status: response.status,
        text: await response.text(),
      };
    }, { loginUrl: endpoint(Routes.AUTH_LOGIN), credentials });

    expect(responseData.status).toBe(201);

    const body = JSON.parse(responseData.text) as { token?: unknown };
    expect(body.token).toEqual(expect.any(String));
    expect((body.token as string).length).toBeGreaterThan(0);
  });

  test('POST - Invalid login @master @regression', async ({ page }) => {
    const response = await browserRequest(page, 'POST', endpoint(Routes.AUTH_LOGIN), {
      username: 'invalid-user', password: 'invalid-password',
    });
    expect(response.status()).toBe(401);
    expect((await response.json() as { message: string }).message).toBe('username or password is incorrect');
  });
});

test.describe('FakeStore Products API', () => {
  test('GET - All products @master @sanity', async ({ page }) => {
    const response = await browserRequest(page, 'GET', endpoint(Routes.GET_ALL_PRODUCTS));
    expect(response.status()).toBe(200);
    const products = await response.json() as Product[];
    expect(Array.isArray(products)).toBeTruthy();
    expect(products.length).toBeGreaterThan(0);
    assertProduct(products[0]);
  });

  test('GET - Product by ID @master @sanity', async ({ page }) => {
    const response = await browserRequest(page, 'GET', withId(Routes.GET_PRODUCT_BY_ID, PRODUCT_ID));
    expect(response.status()).toBe(200);
    assertProduct(await response.json() as Product, PRODUCT_ID);
  });

  test('GET - Products with limit @master @regression', async ({ page }) => {
    const response = await browserRequest(page, 'GET', withValue(Routes.GET_PRODUCTS_WITH_LIMIT, 'limit', LIMIT));
    expect(response.status()).toBe(200);
    const products = await response.json() as Product[];
    expect(Array.isArray(products)).toBeTruthy();
    expect(products.length).toBe(LIMIT);
  });

  for (const direction of ['asc', 'desc'] as const) {
    test(`GET - Products sorted ${direction} @master @regression`, async ({ page }) => {
      const response = await browserRequest(page, 'GET', withValue(Routes.GET_PRODUCTS_SORTED, 'order', direction));
      expect(response.status()).toBe(200);
      const products = await response.json() as Product[];
      assertSorted(products.map(product => product.id), direction);
    });
  }

  test('GET - All product categories @master @sanity', async ({ page }) => {
    const response = await browserRequest(page, 'GET', endpoint(Routes.GET_ALL_CATEGORIES));
    expect(response.status()).toBe(200);
    const categories = await response.json() as unknown[];
    expect(Array.isArray(categories)).toBeTruthy();
    expect(categories.length).toBeGreaterThan(0);
  });

  test('GET - Products by category @master @regression', async ({ page }) => {
    const category = 'electronics';
    const response = await browserRequest(page, 'GET', withValue(Routes.GET_PRODUCTS_BY_CATEGORY, 'category', category));
    expect(response.status()).toBe(200);
    const products = await response.json() as Product[];
    expect(products.every(product => product.category === category)).toBeTruthy();
  });

  test('POST/PUT/DELETE - Product CRUD workflow @master @end-to-end', async ({ page }) => {
    const product = RandomDataUtil.generateProductPayload();
    const createResponse = await browserRequest(page, 'POST', endpoint(Routes.CREATE_PRODUCT), product);
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json() as Product;
    expect(created.id).toEqual(expect.any(Number));
    expect(created.title).toBe(product.title);

    const updatedPayload = { ...product, title: `Updated-${product.title}` };
    const updateResponse = await browserRequest(page, 'PUT', withId(Routes.UPDATE_PRODUCT, created.id), updatedPayload);
    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json() as Product;
    expect(updated.id).toBe(created.id);
    expect(updated.title).toBe(updatedPayload.title);

    const deleteResponse = await browserRequest(page, 'DELETE', withId(Routes.DELETE_PRODUCT, created.id));
    expect(deleteResponse.status()).toBe(200);
  });
});

test.describe('FakeStore Users API', () => {
  test('GET - All users @master @sanity', async ({ page }) => {
    const response = await browserRequest(page, 'GET', endpoint(Routes.GET_ALL_USERS));
    expect(response.status()).toBe(200);
    const users = await response.json() as User[];
    expect(Array.isArray(users)).toBeTruthy();
    expect(users.length).toBeGreaterThan(0);
  });

  test('GET - User by ID @master @sanity', async ({ page }) => {
    const response = await browserRequest(page, 'GET', withId(Routes.GET_USER_BY_ID, USER_ID));
    expect(response.status()).toBe(200);
    expect((await response.json() as User).id).toBe(USER_ID);
  });

  test('GET - Users with limit @master @regression', async ({ page }) => {
    const response = await browserRequest(page, 'GET', withValue(Routes.GET_USERS_WITH_LIMIT, 'limit', LIMIT));
    expect(response.status()).toBe(200);
    expect((await response.json() as User[]).length).toBe(LIMIT);
  });

  for (const direction of ['asc', 'desc'] as const) {
    test(`GET - Users sorted ${direction} @master @regression`, async ({ page }) => {
      const response = await browserRequest(page, 'GET', withValue(Routes.GET_USERS_SORTED, 'order', direction));
      expect(response.status()).toBe(200);
      assertSorted((await response.json() as User[]).map(user => user.id), direction);
    });
  }

  test('POST/PUT/DELETE - User CRUD workflow @master @end-to-end', async ({ page }) => {
    const user = RandomDataUtil.generateUserPayload();
    const createResponse = await browserRequest(page, 'POST', endpoint(Routes.CREATE_USER), user);
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json() as User;
    expect(created.id).toEqual(expect.any(Number));
    //expect(created.email).toBe(user.email);

    const updatedPayload = { ...user, username: `updated-${user.username}` };
    const updateResponse = await browserRequest(page, 'PUT', withId(Routes.UPDATE_USER, created.id), updatedPayload);
    expect(updateResponse.status()).toBe(200);
    expect((await updateResponse.json() as User).username).toBe(updatedPayload.username);

    const deleteResponse = await browserRequest(page, 'DELETE', withId(Routes.DELETE_USER, created.id));
    expect(deleteResponse.status()).toBe(200);
  });
});

test.describe('FakeStore Carts API', () => {
  test('GET - All carts @master @sanity', async ({ page }) => {
    const response = await browserRequest(page, 'GET', endpoint(Routes.GET_ALL_CARTS));
    expect(response.status()).toBe(200);
    const carts = await response.json() as Cart[];
    expect(Array.isArray(carts)).toBeTruthy();
    expect(carts.length).toBeGreaterThan(0);
  });

  test('GET - Cart by ID @master @sanity', async ({ page }) => {
    const response = await browserRequest(page, 'GET', withId(Routes.GET_CART_BY_ID, CART_ID));
    expect(response.status()).toBe(200);
    expect((await response.json() as Cart).id).toBe(CART_ID);
  });

  test('GET - Carts by date range @master @regression', async ({ page }) => {
    const route = Routes.GET_CARTS_BY_DATE_RANGE.replace('{startdate}', START_DATE).replace('{enddate}', END_DATE);
    const response = await browserRequest(page, 'GET', endpoint(route));
    expect(response.status()).toBe(200);
    expect(Array.isArray(await response.json())).toBeTruthy();
  });

  test('GET - User carts @master @regression', async ({ page }) => {
    const response = await browserRequest(page, 'GET', withValue(Routes.GET_USER_CART, 'userId', USER_ID));
    expect(response.status()).toBe(200);
    const carts = await response.json() as Cart[];
    expect(carts.every(cart => cart.userId === USER_ID)).toBeTruthy();
  });

  test('GET - Carts with limit @master @regression', async ({ page }) => {
    const response = await browserRequest(page, 'GET', withValue(Routes.GET_CARTS_WITH_LIMIT, 'limit', LIMIT));
    expect(response.status()).toBe(200);
    expect((await response.json() as Cart[]).length).toBe(LIMIT);
  });

  for (const direction of ['asc', 'desc'] as const) {
    test(`GET - Carts sorted ${direction} @master @regression`, async ({ page }) => {
      const response = await browserRequest(page, 'GET', withValue(Routes.GET_CARTS_SORTED, 'order', direction));
      expect(response.status()).toBe(200);
      assertSorted((await response.json() as Cart[]).map(cart => cart.id), direction);
    });
  }

  test('POST/PUT/DELETE - Cart CRUD workflow @master @end-to-end', async ({ page }) => {
    const cart = RandomDataUtil.generateCartPayload(USER_ID);
    const createResponse = await browserRequest(page, 'POST', endpoint(Routes.CREATE_CART), cart);
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json() as Cart;
    expect(created.id).toEqual(expect.any(Number));
    expect(created.userId).toBe(cart.userId);
    expect(created.products).toEqual(cart.products);

    const updatedPayload = { ...cart, products: [{ ...cart.products[0], quantity: cart.products[0].quantity + 1 }] };
    const updateResponse = await browserRequest(page, 'PUT', withId(Routes.UPDATE_CART, created.id), updatedPayload);
    expect(updateResponse.status()).toBe(200);
    expect((await updateResponse.json() as Cart).products[0].quantity).toBe(updatedPayload.products[0].quantity);

    const deleteResponse = await browserRequest(page, 'DELETE', withId(Routes.DELETE_CART, created.id));
    expect(deleteResponse.status()).toBe(200);
  });
});

test.describe('FakeStore JSON schemas', () => {
  const ajv = new Ajv({ allErrors: true });

  test('Product response matches schema @master @sanity', async ({ page }) => {
    const response = await browserRequest(page, 'GET', withId(Routes.GET_PRODUCT_BY_ID, PRODUCT_ID));
    expect(response.status()).toBe(200);
    const schema = DataProvider.readJson(path.resolve(__dirname, '../../api/schemas/product_api_schema.json'));
    const valid = ajv.compile(schema)(await response.json());
    expect(valid, JSON.stringify(ajv.errors)).toBeTruthy();
  });

  test('User response matches schema @master @sanity', async ({ page }) => {
    const response = await browserRequest(page, 'GET', withId(Routes.GET_USER_BY_ID, USER_ID));
    expect(response.status()).toBe(200);
    const schema = DataProvider.readJson(path.resolve(__dirname, '../../api/schemas/user_api_schema.json'));
    const valid = ajv.compile(schema)(await response.json());
    expect(valid, JSON.stringify(ajv.errors)).toBeTruthy();
  });

  test('Cart response matches schema @master @sanity', async ({ page }) => {
    const response = await browserRequest(page, 'GET', withId(Routes.GET_CART_BY_ID, CART_ID));
    expect(response.status()).toBe(200);
    const schema = DataProvider.readJson(path.resolve(__dirname, '../../api/schemas/cart_api_schema.json'));
    const valid = ajv.compile(schema)(await response.json());
    expect(valid, JSON.stringify(ajv.errors)).toBeTruthy();
  });
});