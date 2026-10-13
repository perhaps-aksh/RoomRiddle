import {ageFilters, filterMysteries, mysteries, typeFilters} from '../src/data/mysteries';

const ids = (list: {id: string}[]) => list.map(m => m.id).sort();

describe('library filters', () => {
  it('offers only the groups and types the library has', () => {
    expect(ageFilters()).toEqual(['any', 'all', 'family', 'teens']);
    expect(typeFilters()).toEqual(['any', 'thriller', 'gothic', 'tech', 'adventure', 'riddle']);
  });

  it('an age filter means "suitable for": younger groups get the cases written for them and for everyone', () => {
    expect(ids(filterMysteries(mysteries, 'all', 'any'))).toEqual(['the-yakshas-questions']);
    expect(ids(filterMysteries(mysteries, 'family', 'any'))).toEqual(['the-forgotten-temple', 'the-yakshas-questions']);
    expect(filterMysteries(mysteries, 'teens', 'any')).toHaveLength(mysteries.length);
  });

  it('age and type combine; an impossible combination is empty, not an error', () => {
    expect(ids(filterMysteries(mysteries, 'any', 'thriller'))).toEqual(['the-last-train']);
    expect(filterMysteries(mysteries, 'all', 'tech')).toEqual([]);
  });
});
