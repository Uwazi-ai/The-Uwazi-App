/** Letter sounds spoken as a child hears them, used by Letter Racer prompts. */
export const LETTER_SOUNDS: Record<string, string> = {
  a: "ah", b: "buh", c: "kuh", d: "duh", e: "eh", f: "fff", g: "guh", h: "hhh", i: "ih", j: "juh", k: "kuh", l: "lll", m: "mmm",
  n: "nnn", o: "oh", p: "puh", q: "kwuh", r: "rrr", s: "sss", t: "tuh", u: "uh", v: "vvv", w: "wuh", x: "ks", y: "yuh", z: "zzz",
};

export const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

/** Words that have a drawn picture in icons.ts. Anything else shows its first letter. */
export const ICON_WORDS = [
  "ball", "sun", "cat", "dog", "hat", "map", "pig", "tent", "bus", "fan", "star", "car", "frog", "log", "bug", "rug", "mug", "cake",
  "bed", "top", "mop", "van", "pan", "jar", "cup", "pen", "jam", "moon", "egg", "fog", "bun", "run", "fun", "hug", "wig", "dig",
  "big", "man", "red", "sled", "shed", "hop", "pop", "far", "lake", "snake", "rake", "bat", "mat", "jump", "the", "and", "you", "see",
  "go", "up", "we", "my",
] as const;
