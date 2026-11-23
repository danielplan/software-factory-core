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
- Keep a form's untouched values derived from the query's data and the
  person's edits in a draft that is empty until they change something: no
  effect copies data into state, and the draft survives the next read.
- A focused render test catches raw text outside `<Text>` before it crashes
  on a device.
- An address written in a test is not always the one the app calls: check
  the address the pretend `fetch` received.
- Expo's generated router types can break while an old preview watches new
  files: stop the preview and generate them again before reading type
  errors.
- The prototype scripts load the pretend backend with Node itself, which
  needs the `.ts` extension on every relative import that file makes; the
  tests and Metro do not notice one missing. Start the live prototype once
  after splitting that file.
- In the browser preview, `flex: 0` on a tile in a column squashes it to
  nothing (React Native for web reads it as `flex: 0 0 0%`), while a phone
  sizes it by its content: give a stacked tile no flex, and `flex: 1` only to
  tiles that share a row.
- A size measured with `onLayout` arrives after the first frame, and never
  in Jest: start from `useWindowDimensions()` minus the known insets, then
  take the measured size.
- A chart library's own touch handling may give SVG shapes touch properties
  a browser does not know: put plain `Pressable` areas over the chart instead.
- Some embedded browsers (inside desktop apps) block service workers, so the
  web prototype's pretend backend (MSW) cannot start there: open it in a full
  browser.
- In Node 24, `localhost` may resolve to the IPv6 address first, which
  Android's host bridge cannot reach: start Node with
  `--dns-result-order=ipv4first`, or write `127.0.0.1`.
- Restarting an Android emulator clears `adb reverse`: set it again, and
  check the bundle's address, not only that the server answers.
- adb's background service can get stuck: commands hang or fail at once with
  "cannot connect to daemon", and `adb kill-server` cannot reach it. Stopping
  every adb process does; the next command starts a fresh one. Give each adb
  command a time limit.
- On Windows, Node starts `npm` only through a shell or as `npm.cmd` (a plain
  `spawn("npm")` fails with ENOENT), and PowerShell's script policy may block
  `npm.ps1`: use `npm.cmd` there.
- Reload Expo Go after changing the root layout.
