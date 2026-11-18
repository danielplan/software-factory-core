import { http, HttpResponse } from 'msw';
import { fireEvent } from '@testing-library/react-native';
import { currentData, pretendApi, pretendServer } from '../pretend-backend';
import { renderApp, screen } from '../render-app';

// The home screen: what the app is, the items the backend gives, an empty
// list said plainly, and a failed load that can be tried again.

const items = [
  { id: 'item-1', name: 'First', note: 'A note' },
  { id: 'item-2', name: 'Second', note: null },
];

test('the home screen says what the app is and shows the items', async () => {
  await renderApp({ items });
  expect(
    await screen.findByRole('header', { name: 'New phone app' }),
  ).toBeOnTheScreen();
  expect(screen.getByText(/starting point/)).toBeOnTheScreen();
  expect(screen.getByText('First')).toBeOnTheScreen();
  expect(screen.getByText('A note')).toBeOnTheScreen();
  expect(screen.getByText('Second')).toBeOnTheScreen();
  expect(currentData().calls).toEqual(['GET /items']);
});

test('with no items the home screen says so', async () => {
  await renderApp({ items: [] });
  expect(await screen.findByText('No items yet')).toBeOnTheScreen();
  expect(screen.queryByText('Items')).toBeNull();
});

function refuseOnce(body: object, status: number) {
  pretendServer.use(
    http.get(
      `${pretendApi}/api/items`,
      () => HttpResponse.json(body, { status }),
      { once: true },
    ),
  );
}

test('a failed load says what went wrong and tries again', async () => {
  refuseOnce({ error: 'too_many_requests' }, 429);
  await renderApp({ items });
  expect(await screen.findByText(/Too many tries/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('First')).toBeOnTheScreen();
});

test("a refusal the app does not know shows the backend's sentence", async () => {
  refuseOnce({ error: 'server_error', message: 'The server failed.' }, 500);
  await renderApp({ items });
  expect(await screen.findByText('The server failed.')).toBeOnTheScreen();
});

test('a refusal without words shows a general sentence', async () => {
  refuseOnce({ error: 'server_error' }, 500);
  await renderApp({ items });
  expect(
    await screen.findByText('Something went wrong. Try again.'),
  ).toBeOnTheScreen();
});
