// Client-side username generation
const adjectives = [
  'Silent', 'Ghost', 'Shadow', 'Quick', 'Hidden',
  'Swift', 'Crimson', 'Azure', 'Dark', 'Bright',
  'Calm', 'Wild', 'Frost', 'Blaze', 'Storm',
  'Mystic', 'Noble', 'Rogue', 'Sage', 'Void'
];

const nouns = [
  'Panda', 'Tiger', 'Wolf', 'Eagle', 'Hawk',
  'Fox', 'Bear', 'Lion', 'Shark', 'Viper',
  'Raven', 'Cobra', 'Lynx', 'Falcon', 'Phoenix',
  'Dragon', 'Demon', 'Angel', 'Spirit', 'Wanderer'
];

export function generateUsername() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}_${noun}_${num}`;
}

export function generateAvatarSeed() {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}
