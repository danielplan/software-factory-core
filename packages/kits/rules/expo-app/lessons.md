# Expo app lessons

Traps met in Expo and React Native apps, and what to do about them.

- Expo's development server lays the app's .env files over the settings it
  was started with: a value given on the command line loses to the same name
  in a .env file next to the app. Keep a folder that must not use the app's
  settings free of .env files.
- After creating or changing a .env file while Expo runs, restart it and check
  what the served bundle actually uses.
- Put shared app state above Expo Router's root stack when navigation must
  keep work in progress.
- A themed Expo shell does not theme the navigator's content: set the stack's
  content background from the active theme, in both palettes.
- Put SafeAreaProvider around the root stack and SafeAreaView in the shared
  screen shell.
- Query tests need zero cache times, and a client seeded with data must be
  cleared before the test ends, or Jest stays alive.
- Check package versions against Expo: the latest ESLint or test renderer can
  conflict with Expo's plugins and React.
- Jest's testMatch written from the root folder finds no tests when a parent
  folder starts with a dot; write it as a pattern that matches anywhere.
- Background location needs a development build; Expo Go cannot check it.
- Read picked image files with Expo FileSystem, not fetch(uri).blob(), and
  detect the image type from the bytes.
- dependency-cruiser opens every file an import reaches: imported pictures
  must be excluded from following, or the real artwork fails it.
