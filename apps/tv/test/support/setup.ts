/* eslint-env jest */
import AsyncStorage from '@amazon-devices/react-native-async-storage__async-storage';

// Each test starts with nothing saved, so settings never leak between tests.
beforeEach(async () => {
  await AsyncStorage.clear();
});
