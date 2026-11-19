import { announcement } from '../../prototype/start';
import { situations } from '../../prototype/situations';
import { renderApp, screen } from '../render-app';

// Every situation of the prototype (prototype/situations.ts) opens the app
// on its home screen; a situation the app cannot read would end on the
// error screen instead.
test.each(situations.map((situation) => [situation.name, situation]))(
  'the prototype opens the app in the situation "%s"',
  async (_name, situation) => {
    await renderApp(situation.data());
    expect(
      await screen.findByRole('header', { name: 'New phone app' }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  },
);

test('the prototype has a normal day first and an empty one', () => {
  expect(situations.map((row) => [row.key, row.name])).toEqual([
    ['normal-day', 'A normal day'],
    ['empty', 'Empty'],
  ]);
  expect(situations[0]?.data().items.length).toBeGreaterThan(0);
  expect(situations[1]?.data().items).toEqual([]);
});

test('the prototype tells the factory its situations', () => {
  expect(announcement('empty')).toEqual({
    type: 'factory-prototype',
    app: 'new-phone-app',
    situations: [
      { key: 'normal-day', name: 'A normal day' },
      { key: 'empty', name: 'Empty' },
    ],
    current: 'empty',
    world: false,
  });
});
