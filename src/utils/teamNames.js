const BASE_NAMES = {
  // Current franchises
  ARI: 'Arizona Cardinals',     ARZ: 'Arizona Cardinals',
  ATL: 'Atlanta Falcons',
  BAL: 'Baltimore Ravens',      BLT: 'Baltimore Ravens',
  BUF: 'Buffalo Bills',
  CAR: 'Carolina Panthers',
  CHI: 'Chicago Bears',
  CIN: 'Cincinnati Bengals',
  CLE: 'Cleveland Browns',      CLV: 'Cleveland Browns',
  DAL: 'Dallas Cowboys',
  DEN: 'Denver Broncos',
  DET: 'Detroit Lions',
  GB:  'Green Bay Packers',
  HOU: 'Houston Texans',        HST: 'Houston Texans',
  IND: 'Indianapolis Colts',
  JAX: 'Jacksonville Jaguars',  JAC: 'Jacksonville Jaguars',
  KC:  'Kansas City Chiefs',
  LAC: 'Los Angeles Chargers',
  LAR: 'Los Angeles Rams',      LA: 'Los Angeles Rams',
  LV:  'Las Vegas Raiders',
  MIA: 'Miami Dolphins',
  MIN: 'Minnesota Vikings',
  NE:  'New England Patriots',
  NO:  'New Orleans Saints',
  NYG: 'New York Giants',
  NYJ: 'New York Jets',
  PHI: 'Philadelphia Eagles',
  PIT: 'Pittsburgh Steelers',
  SEA: 'Seattle Seahawks',
  SF:  'San Francisco 49ers',
  TB:  'Tampa Bay Buccaneers',
  TEN: 'Tennessee Titans',
  // Historical names
  OAK: 'Oakland Raiders',
  SD:  'San Diego Chargers',
  STL: 'St. Louis Rams',        SL: 'St. Louis Rams',
};

// Washington had three names
function washingtonName(season) {
  if (season >= 2022) return 'Washington Commanders';
  if (season >= 2020) return 'Washington Football Team';
  return 'Washington Redskins';
}

export function getTeamName(team, season) {
  if (team === 'WAS' || team === 'WSH') return washingtonName(season);
  return BASE_NAMES[team] ?? team;
}

// ESPN CDN logo abbreviation — maps every nflverse abbreviation to the ESPN slug
const LOGO_SLUG = {
  ARI: 'ari', ARZ: 'ari',
  ATL: 'atl',
  BAL: 'bal', BLT: 'bal',
  BUF: 'buf',
  CAR: 'car',
  CHI: 'chi',
  CIN: 'cin',
  CLE: 'cle', CLV: 'cle',
  DAL: 'dal',
  DEN: 'den',
  DET: 'det',
  GB:  'gb',
  HOU: 'hou', HST: 'hou',
  IND: 'ind',
  JAX: 'jax', JAC: 'jax',
  KC:  'kc',
  LAC: 'lac', SD: 'lac',
  LAR: 'lar', LA: 'lar', STL: 'lar', SL: 'lar',
  LV:  'lv',  OAK: 'lv',
  MIA: 'mia',
  MIN: 'min',
  NE:  'ne',
  NO:  'no',
  NYG: 'nyg',
  NYJ: 'nyj',
  PHI: 'phi',
  PIT: 'pit',
  SEA: 'sea',
  SF:  'sf',
  TB:  'tb',
  TEN: 'ten',
  WAS: 'was', WSH: 'was',
};

// Franchise key — groups historical relocations together
const FRANCHISE_MAP = {
  ARI: 'cardinals',  ARZ: 'cardinals',
  ATL: 'falcons',
  BAL: 'ravens',     BLT: 'ravens',
  BUF: 'bills',
  CAR: 'panthers',
  CHI: 'bears',
  CIN: 'bengals',
  CLE: 'browns',     CLV: 'browns',
  DAL: 'cowboys',
  DEN: 'broncos',
  DET: 'lions',
  GB:  'packers',
  HOU: 'texans',     HST: 'texans',
  IND: 'colts',
  JAX: 'jaguars',    JAC: 'jaguars',
  KC:  'chiefs',
  LAC: 'chargers',   SD:  'chargers',
  LAR: 'rams',       LA:  'rams',   STL: 'rams', SL: 'rams',
  LV:  'raiders',    OAK: 'raiders',
  MIA: 'dolphins',
  MIN: 'vikings',
  NE:  'patriots',
  NO:  'saints',
  NYG: 'giants',
  NYJ: 'jets',
  PHI: 'eagles',
  PIT: 'steelers',
  SEA: 'seahawks',
  SF:  '49ers',
  TB:  'buccaneers',
  TEN: 'titans',
  WAS: 'washington', WSH: 'washington',
};

export function getFranchise(team) {
  return FRANCHISE_MAP[team] ?? team.toLowerCase();
}

// All 32 current franchises — used for the win-condition tracker
export const ALL_FRANCHISES = [
  { franchise: 'cardinals',  slug: 'ari', name: 'Cardinals'  },
  { franchise: 'falcons',    slug: 'atl', name: 'Falcons'    },
  { franchise: 'ravens',     slug: 'bal', name: 'Ravens'     },
  { franchise: 'bills',      slug: 'buf', name: 'Bills'      },
  { franchise: 'panthers',   slug: 'car', name: 'Panthers'   },
  { franchise: 'bears',      slug: 'chi', name: 'Bears'      },
  { franchise: 'bengals',    slug: 'cin', name: 'Bengals'    },
  { franchise: 'browns',     slug: 'cle', name: 'Browns'     },
  { franchise: 'cowboys',    slug: 'dal', name: 'Cowboys'    },
  { franchise: 'broncos',    slug: 'den', name: 'Broncos'    },
  { franchise: 'lions',      slug: 'det', name: 'Lions'      },
  { franchise: 'packers',    slug: 'gb',  name: 'Packers'    },
  { franchise: 'texans',     slug: 'hou', name: 'Texans'     },
  { franchise: 'colts',      slug: 'ind', name: 'Colts'      },
  { franchise: 'jaguars',    slug: 'jax', name: 'Jaguars'    },
  { franchise: 'chiefs',     slug: 'kc',  name: 'Chiefs'     },
  { franchise: 'chargers',   slug: 'lac', name: 'Chargers'   },
  { franchise: 'rams',       slug: 'lar', name: 'Rams'       },
  { franchise: 'raiders',    slug: 'lv',  name: 'Raiders'    },
  { franchise: 'dolphins',   slug: 'mia', name: 'Dolphins'   },
  { franchise: 'vikings',    slug: 'min', name: 'Vikings'    },
  { franchise: 'patriots',   slug: 'ne',  name: 'Patriots'   },
  { franchise: 'saints',     slug: 'no',  name: 'Saints'     },
  { franchise: 'giants',     slug: 'nyg', name: 'Giants'     },
  { franchise: 'jets',       slug: 'nyj', name: 'Jets'       },
  { franchise: 'eagles',     slug: 'phi', name: 'Eagles'     },
  { franchise: 'steelers',   slug: 'pit', name: 'Steelers'   },
  { franchise: 'seahawks',   slug: 'sea', name: 'Seahawks'   },
  { franchise: '49ers',      slug: 'sf',  name: '49ers'      },
  { franchise: 'buccaneers', slug: 'tb',  name: 'Buccaneers' },
  { franchise: 'titans',     slug: 'ten', name: 'Titans'     },
  { franchise: 'washington', slug: 'was', name: 'Washington' },
];

export function getLogoUrl(team) {
  const slug = LOGO_SLUG[team];
  if (!slug) return null;
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`;
}
