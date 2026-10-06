import {channelGain, DEFAULT_SETTINGS, nextVolume, parseSettings} from '../src/settings/settings';

describe('settings rules', () => {
  it('parses only valid fields and drops the rest', () => {
    expect(parseSettings(null)).toEqual({});
    expect(parseSettings('{oops')).toEqual({});
    expect(parseSettings('[1,2]')).toEqual({});
    expect(parseSettings(JSON.stringify({motion: 'reduced', scenes: 'casefile', music: 50, sfx: 33, muted: 'yes', subtitles: false, extra: 1}))).toEqual({
      motion: 'reduced',
      scenes: 'casefile',
      music: 50,
      subtitles: false,
    });
  });

  it('volume cycles 100 → 75 → 50 → 25 → off → 100', () => {
    expect([100, 75, 50, 25, 0].map(v => nextVolume(v as 100))).toEqual([75, 50, 25, 0, 100]);
  });

  it('channel gain is master × channel, zero when muted; ambient follows effects', () => {
    const s = {...DEFAULT_SETTINGS, master: 50 as const, music: 50 as const, sfx: 100 as const};
    expect(channelGain(s, 'music')).toBe(0.25);
    expect(channelGain(s, 'ambient')).toBe(0.5);
    expect(channelGain({...s, muted: true}, 'sfx')).toBe(0);
  });
});
