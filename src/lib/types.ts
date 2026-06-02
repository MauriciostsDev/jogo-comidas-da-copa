export type Country = {
  id: number;
  name_pt: string;
  flag: string;
  confederation: string;
  drawn: boolean;
};

export type MatchStatus = "writing" | "cooking" | "done";

export type Match = {
  id: string;
  country_id: number | null;
  status: MatchStatus;
  writing_deadline: string;
  chosen_food_id: string | null;
  photo_url: string | null;
  created_at: string;
};

export type Food = {
  id: string;
  match_id: string;
  user_id: string;
  author_name: string;
  text: string;
  created_at: string;
};
