/* eslint-env jest */
/**
 * Test-only BackHandler mock.
 *
 * Under the Vega jest preset, `require('react-native').BackHandler` is undefined
 * (the preset mocks KeplerBackHandler but not BackHandler; see docs/friction-log.md
 * FL-004). Mocking the `.kepler` variant fixes it. This mock returns a real subscription
 * and records handlers so tests can simulate the remote's Back button via `pressBack()`.
 */
type BackPressHandler = () => boolean | null | undefined | void;

const handlers: BackPressHandler[] = [];

const mockBackHandler = {
  exitApp: jest.fn(),
  addEventListener: jest.fn((_event: string, handler: BackPressHandler) => {
    handlers.push(handler);
    return {
      remove: () => {
        const index = handlers.indexOf(handler);
        if (index >= 0) {
          handlers.splice(index, 1);
        }
      },
    };
  }),
};

jest.mock(
  '@amazon-devices/react-native-kepler/Libraries/Utilities/BackHandler.kepler',
  () => ({__esModule: true, default: mockBackHandler}),
);

/** Simulate one press of the remote's Back button. Returns true if an app handler consumed it. */
export function pressBack(): boolean {
  for (let i = handlers.length - 1; i >= 0; i -= 1) {
    if (handlers[i]()) {
      return true;
    }
  }
  mockBackHandler.exitApp();
  return false;
}

export {mockBackHandler};
