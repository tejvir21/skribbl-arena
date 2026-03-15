const WORD_BANK = {
  general: [
    "apple", "bicycle", "bridge", "butterfly", "camera", "castle", "cloud",
    "coffee", "diamond", "dragon", "elephant", "envelope", "fire", "flower",
    "guitar", "hammer", "house", "island", "jellyfish", "keyboard", "ladder",
    "lantern", "lighthouse", "magnet", "mirror", "mountain", "mushroom",
    "notebook", "ocean", "paintbrush", "penguin", "piano", "pizza", "rainbow",
    "rocket", "scissors", "snowflake", "spider", "stadium", "submarine",
    "sunrise", "telescope", "thunder", "tornado", "treasure", "umbrella",
    "volcano", "waterfall", "windmill", "wizard",
  ],
  animals: [
    "alligator", "armadillo", "baboon", "bat", "bear", "beaver", "buffalo",
    "camel", "chameleon", "cheetah", "cobra", "crab", "crocodile", "deer",
    "dolphin", "eagle", "flamingo", "fox", "frog", "giraffe", "gorilla",
    "hamster", "hawk", "hedgehog", "hippopotamus", "jaguar", "kangaroo",
    "koala", "leopard", "lion", "lobster", "lynx", "manta ray", "monkey",
    "moose", "narwhal", "octopus", "otter", "owl", "panda", "parrot",
    "platypus", "polar bear", "porcupine", "rabbit", "raccoon", "rhino",
    "seal", "shark", "sloth", "squirrel", "tiger", "toucan", "turtle",
    "walrus", "whale", "wolf", "zebra",
  ],
  movies: [
    "Avengers", "Batman", "Cinderella", "dinosaur", "Frozen", "ghost",
    "Hulk", "Indiana Jones", "Jurassic Park", "king kong", "lightsaber",
    "Matrix", "Nemo", "Pinocchio", "quicksand", "Robin Hood", "Shrek",
    "Titanic", "unicorn", "Voldemort", "Wolverine", "Yoda", "zombie",
    "Aladdin", "Bambi", "Dory", "Elsa", "Gandalf", "Hermione", "Iron Man",
    "Joker", "Kung Fu Panda", "Loki", "Merlin", "Narnia", "Obi-Wan",
    "Princess Leia", "Rapunzel", "Simba", "Thor", "Ursula",
  ],
  nature: [
    "aurora", "avalanche", "canyon", "cave", "cliff", "comet", "coral reef",
    "crater", "crystal", "cyclone", "desert", "dune", "eclipse", "estuary",
    "fjord", "forest", "geyser", "glacier", "grove", "hurricane", "iceberg",
    "jungle", "lagoon", "lava", "meadow", "meteor", "monsoon", "nebula",
    "oasis", "plateau", "quicksand", "rapids", "reef", "savanna", "stalactite",
    "swamp", "tide pool", "tundra", "typhoon", "valley", "vortex", "wetland",
  ],
};

const getRandomWords = (category = "general", count = 3) => {
  const bank = WORD_BANK[category] || WORD_BANK.general;
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

/**
 * Generate a cumulative hint for a word.
 * Each call reveals `totalReveal` letters — never fewer than previously revealed.
 * @param {string} word          - The word to hint
 * @param {number} totalReveal   - Total letters to reveal (cumulative)
 * @param {string|null} prevHint - Previous hint string (so we keep already-revealed letters)
 */
const getWordHint = (word, totalReveal, prevHint = null) => {
  const chars = word.split("");

  // Find indices of non-space characters
  const letterIndices = chars
    .map((c, i) => (c !== " " ? i : null))
    .filter((i) => i !== null);

  // Collect already-revealed indices from previous hint
  const alreadyRevealed = new Set();
  if (prevHint) {
    const prevChars = prevHint.split("");
    prevChars.forEach((c, i) => {
      if (c !== "_" && c !== " " && i < chars.length) {
        alreadyRevealed.add(i);
      }
    });
  }

  // Pick additional letters to reveal (excluding already revealed and spaces)
  const hidden = letterIndices.filter((i) => !alreadyRevealed.has(i));
  const additionalNeeded = Math.max(0, totalReveal - alreadyRevealed.size);
  const toReveal = hidden
    .sort(() => Math.random() - 0.5)
    .slice(0, additionalNeeded);

  const revealSet = new Set([...alreadyRevealed, ...toReveal]);

  return chars.map((c, i) =>
    c === " " ? " " : revealSet.has(i) ? c : "_"
  ).join("");
};

const checkGuess = (guess, word) => {
  if (!word) return false;
  return guess.trim().toLowerCase() === word.toLowerCase();
};

/**
 * True if guess is within edit distance 2 of the target (and not exactly correct).
 * Uses a simple position-based diff that's fast and good enough for single words.
 */
const getCloseGuess = (guess, word) => {
  if (!word) return false;
  const g = guess.trim().toLowerCase();
  const w = word.toLowerCase();
  if (g === w) return false;
  if (Math.abs(g.length - w.length) > 2) return false;
  // Count character mismatches at each position
  let changes = 0;
  const maxLen = Math.max(g.length, w.length);
  for (let i = 0; i < maxLen; i++) {
    if (g[i] !== w[i]) changes++;
  }
  return changes <= 2;
};

module.exports = { WORD_BANK, getRandomWords, getWordHint, checkGuess, getCloseGuess };
