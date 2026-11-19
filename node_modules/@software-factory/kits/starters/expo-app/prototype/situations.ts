import type { Data } from './pretend-backend';

// The situations a prototype can start in: made-up data for the pretend
// backend. `?situation=<key>` in the page's address picks one (in Expo Go,
// `npm run prototype:phone -- --situation <key>`); the first is the default.
// The names are shown by the factory around the prototype, not by the app.
// When the factory gives a shared world, its data is used instead.

export type Situation = {
  key: string;
  name: string;
  data: () => Omit<Data, 'calls'>;
};

export const situations: Situation[] = [
  {
    key: 'normal-day',
    name: 'A normal day',
    data: () => ({
      items: [
        { id: 'item-1', name: 'First made-up item', note: 'A short note' },
        { id: 'item-2', name: 'Second made-up item', note: null },
        { id: 'item-3', name: 'Third made-up item', note: 'Another note' },
      ],
    }),
  },
  {
    key: 'empty',
    name: 'Empty',
    data: () => ({ items: [] }),
  },
];
