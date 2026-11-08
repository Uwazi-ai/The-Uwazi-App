import type { GameId } from "./types";
import dinoEggHunt from "./data/dino-egg-hunt.json";
import letterRacer from "./data/letter-racer.json";
import blockBuilder from "./data/block-builder.json";
import parkCourse from "./data/park-course.json";
import rhymeRoar from "./data/rhyme-roar.json";
import wordBuilder from "./data/word-builder.json";
import heroMemory from "./data/hero-memory.json";
import { PALETTE } from "./config";
import type Phaser from "phaser";

export interface GameInfo {
  id: GameId;
  title: string;
  sceneKey: string;
  teaches: string;
  color: number;
  levels: { name: string; trophy?: string }[];
  icon: (g: Phaser.GameObjects.Graphics, s: number) => void;
}

export const GAMES: GameInfo[] = [
  { id: "dino-egg-hunt", title: dinoEggHunt.title, sceneKey: "DinoEggHunt", teaches: "Counting and numbers", color: PALETTE.teal, levels: dinoEggHunt.levels,
    icon: (g, s) => { g.fillStyle(0xfff3d6, 1).fillEllipse(0, 0, s * 0.9, s * 1.2); g.fillStyle(PALETTE.teal, 1).fillCircle(-s * 0.15, -s * 0.15, s * 0.1).fillCircle(s * 0.2, s * 0.1, s * 0.12); } },
  { id: "letter-racer", title: letterRacer.title, sceneKey: "LetterRacer", teaches: "Letter sounds and spelling", color: PALETTE.orange, levels: letterRacer.levels,
    icon: (g, s) => { g.fillStyle(PALETTE.orange, 1).fillRoundedRect(-s * 0.6, -s * 0.1, s * 1.2, s * 0.45, 8).fillRoundedRect(-s * 0.3, -s * 0.45, s * 0.6, s * 0.4, 6); g.fillStyle(PALETTE.black, 1).fillCircle(-s * 0.35, s * 0.4, s * 0.16).fillCircle(s * 0.35, s * 0.4, s * 0.16); } },
  { id: "block-builder", title: blockBuilder.title, sceneKey: "BlockBuilder", teaches: "Patterns, shapes, colors", color: PALETTE.blue, levels: blockBuilder.levels,
    icon: (g, s) => { g.fillStyle(PALETTE.blue, 1).fillRoundedRect(-s * 0.5, s * 0.1, s * 0.45, s * 0.45, 6); g.fillStyle(PALETTE.orange, 1).fillRoundedRect(s * 0.05, s * 0.1, s * 0.45, s * 0.45, 6); g.fillStyle(PALETTE.gold, 1).fillRoundedRect(-s * 0.22, -s * 0.4, s * 0.45, s * 0.45, 6); } },
  { id: "park-course", title: parkCourse.title, sceneKey: "ParkCourse", teaches: "Over, under, left, right", color: PALETTE.greenLight, levels: parkCourse.levels,
    icon: (g, s) => { g.fillStyle(PALETTE.gold, 1).fillRoundedRect(-s * 0.6, s * 0.3, s * 1.2, s * 0.15, 4); g.lineStyle(6, PALETTE.gold, 1).lineBetween(-s * 0.55, -s * 0.5, -s * 0.3, s * 0.3).lineBetween(s * 0.55, -s * 0.5, s * 0.3, s * 0.3); g.fillStyle(PALETTE.red, 1).fillRoundedRect(-s * 0.25, -s * 0.1, s * 0.5, s * 0.14, 4); } },
  { id: "rhyme-roar", title: rhymeRoar.title, sceneKey: "RhymeRoar", teaches: "Rhyming", color: PALETTE.purple, levels: rhymeRoar.levels,
    icon: (g, s) => { g.fillStyle(PALETTE.purple, 1).fillEllipse(0, s * 0.1, s * 1.1, s * 0.8).fillRoundedRect(s * 0.1, -s * 0.5, s * 0.6, s * 0.5, 8); g.fillStyle(0xffffff, 1).fillCircle(s * 0.5, -s * 0.3, s * 0.08); } },
  { id: "word-builder", title: wordBuilder.title, sceneKey: "WordBuilder", teaches: "Spelling short words", color: PALETTE.gold, levels: wordBuilder.levels,
    icon: (g, s) => { for (let i = -1; i <= 1; i += 1) { g.fillStyle(0xfff6dc, 1).fillRoundedRect(i * s * 0.42 - s * 0.18, -s * 0.2, s * 0.36, s * 0.4, 6); g.fillStyle(PALETTE.black, 1).fillRect(i * s * 0.42 - s * 0.05, -s * 0.1, s * 0.1, s * 0.2); } } },
  { id: "hero-memory", title: heroMemory.title, sceneKey: "HeroMemory", teaches: "Memory and sequencing", color: PALETTE.red, levels: heroMemory.levels,
    icon: (g, s) => { g.fillStyle(PALETTE.greenLight, 1).fillCircle(0, -s * 0.1, s * 0.4); g.fillStyle(PALETTE.charcoal, 1).fillRoundedRect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.2, 6); g.fillStyle(PALETTE.gold, 1).fillCircle(-s * 0.55, s * 0.35, s * 0.12).fillCircle(0, s * 0.45, s * 0.12).fillCircle(s * 0.55, s * 0.35, s * 0.12); } },
];

export const gameById = (id: GameId) => GAMES.find(game => game.id === id)!;
export const DATA = { dinoEggHunt, letterRacer, blockBuilder, parkCourse, rhymeRoar, wordBuilder, heroMemory };
