export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  avatar?: string;
  score: number;
  connected: boolean;
  ready: boolean;
}
