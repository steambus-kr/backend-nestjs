export interface ISteamCMDBody<N extends number> {
  success: boolean;
  data: {
    [K in N]: ISteamCMDData;
  };
}

export interface ISteamCMDData {
  common: { steam_release_date?: `${number}` };
}
