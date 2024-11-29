export interface ISteamUserStats {
  response:
    | {
        result: 1; // 1 if success, else 0
        player_count: number;
      }
    | {
        result: 0;
      };
}
