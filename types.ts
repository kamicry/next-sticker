export interface CharacterDefaultText {
  text: string;
  x: number;
  y: number;
  r: number;
  s: number;
}

export interface CharacterConfig {
  id: string;
  name: string;
  character: string;
  img: string;
  color: string;
  strokeColor?: string;
  defaultText: CharacterDefaultText;
}

export type GameType = "pjsk" | "arcaea";
export type FontType = "YurukaStd" | "SSFangTangTi";
