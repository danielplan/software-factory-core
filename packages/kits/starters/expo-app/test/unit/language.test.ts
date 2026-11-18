import { phoneLanguage } from '@/i18n/i18n';
import { phone } from '../phone';

// The app speaks the phone's language when it knows it, English otherwise.
test("the app speaks the phone's language, or English", () => {
  phone.language = 'en';
  expect(phoneLanguage()).toBe('en');
  phone.language = 'fr';
  expect(phoneLanguage()).toBe('en');
});
