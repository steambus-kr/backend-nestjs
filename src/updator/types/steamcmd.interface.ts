export interface ISteamCMDBody {
  success: boolean;
  data: Record<number, { common: { steam_release_date?: `${number}` } }>;
}
