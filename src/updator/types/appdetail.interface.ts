export type IAppDetailsBody<N extends number> = {
  [K in N]: IAppDetails;
};

export interface IAppDetails {
  success: boolean;
  data: IAppDetailsData;
}

export interface IAppDetailsData {
  name: string;
  short_description: string;
  genres?: { id: `${number}`; description: string }[];
  header_image: string;
  release_date: {
    coming_soom: boolean;
    date: string;
  };
}
