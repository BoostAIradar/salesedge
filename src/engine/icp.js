const PRACTICE_AREAS_HOA = ['hoa foreclosure', 'hoa', 'foreclosure'];
const PRACTICE_AREAS_EVICTION = ['eviction', 'evictions'];
const PRACTICE_AREAS_FULL = [...PRACTICE_AREAS_HOA, ...PRACTICE_AREAS_EVICTION, 'hoa+eviction'];
const TARGET_COUNTIES = ['miami-dade', 'broward'];

export function scoreICP(lead) {
  const breakdown = {
    practiceArea: scorePracticeArea(lead.practiceArea),
    firmSize: scoreFirmSize(lead.firmSize),
    geography: scoreGeography(lead.county),
    matterVolume: scoreMatterVolume(lead.matterVolume),
  };

  const score = breakdown.practiceArea + breakdown.firmSize + breakdown.geography + breakdown.matterVolume;

  return { score: Math.min(score, 100), breakdown };
}

function scorePracticeArea(area) {
  if (!area) return 0;
  const lower = area.toLowerCase().trim();
  if (lower === 'hoa+eviction' || lower === 'hoa & eviction') return 35;
  if (PRACTICE_AREAS_HOA.some(p => lower.includes(p))) return 35;
  if (PRACTICE_AREAS_EVICTION.some(p => lower.includes(p))) return 35;
  if (lower.includes('real estate') || lower.includes('re litigation')) return 15;
  return 0;
}

function scoreFirmSize(size) {
  if (!size) return 0;
  const lower = size.toLowerCase().trim();
  if (lower === 'solo' || lower === 'solo practitioner') return 30;
  if (lower === '2-3' || lower === '2-3 attorneys' || lower === '2-3 atty') return 30;
  if (lower === '4-10' || lower === '4-10 attorneys' || lower === '4-10 atty') return 10;
  return 0;
}

function scoreGeography(county) {
  if (!county) return 0;
  const lower = county.toLowerCase().trim();
  if (TARGET_COUNTIES.some(c => lower.includes(c))) return 25;
  if (lower.includes('palm beach')) return 15;
  return 5;
}

function scoreMatterVolume(volume) {
  if (!volume) return 0;
  const num = typeof volume === 'number' ? volume : parseInt(volume, 10);
  if (isNaN(num)) return 0;
  if (num >= 50) return 10;
  if (num >= 25) return 5;
  return 0;
}

export function calcTier(score) {
  if (score >= 80) return 1;
  if (score >= 50) return 2;
  return 3;
}
