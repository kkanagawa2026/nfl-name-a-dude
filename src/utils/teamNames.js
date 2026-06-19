const BASE_NAMES = {
  ARI: 'Arizona Cardinals',
  ATL: 'Atlanta Falcons',
  BAL: 'Baltimore Ravens',
  BUF: 'Buffalo Bills',
  CAR: 'Carolina Panthers',
  CHI: 'Chicago Bears',
  CIN: 'Cincinnati Bengals',
  CLE: 'Cleveland Browns',
  DAL: 'Dallas Cowboys',
  DEN: 'Denver Broncos',
  DET: 'Detroit Lions',
  GB:  'Green Bay Packers',
  HOU: 'Houston Texans',
  IND: 'Indianapolis Colts',
  JAX: 'Jacksonville Jaguars',
  JAC: 'Jacksonville Jaguars',
  KC:  'Kansas City Chiefs',
  LAC: 'Los Angeles Chargers',
  LAR: 'Los Angeles Rams',
  LA:  'Los Angeles Rams',
  LV:  'Las Vegas Raiders',
  MIA: 'Miami Dolphins',
  MIN: 'Minnesota Vikings',
  NE:  'New England Patriots',
  NO:  'New Orleans Saints',
  NYG: 'New York Giants',
  NYJ: 'New York Jets',
  OAK: 'Oakland Raiders',
  PHI: 'Philadelphia Eagles',
  PIT: 'Pittsburgh Steelers',
  SD:  'San Diego Chargers',
  SEA: 'Seattle Seahawks',
  SF:  'San Francisco 49ers',
  STL: 'St. Louis Rams',
  TB:  'Tampa Bay Buccaneers',
  TEN: 'Tennessee Titans',
  WAS: 'Washington',
  WSH: 'Washington',
};

export function getTeamName(team, season) {
  // Washington name changes
  if (team === 'WAS' || team === 'WSH') {
    if (season >= 2022) return 'Washington Commanders';
    if (season >= 2020) return 'Washington Football Team';
    return 'Washington Redskins';
  }
  return BASE_NAMES[team] ?? team;
}
