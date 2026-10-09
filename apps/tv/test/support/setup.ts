/* eslint-env jest */
import AsyncStorage from '@amazon-devices/react-native-async-storage__async-storage';
import {clearTrace, traceSink} from '../../src/audio/trace';

// Tests read the audio trace in memory; nothing is posted anywhere.
traceSink.url = null;

// Each test starts with nothing saved, so settings never leak between tests.
beforeEach(async () => {
  await AsyncStorage.clear();
  clearTrace();
});
