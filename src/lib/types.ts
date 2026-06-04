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
  caption: string | null;
  partner_id: string | null;
  published: boolean;
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

export type Review = {
  id: string;
  match_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type Like = {
  match_id: string;
  user_id: string;
  created_at: string;
};

export type Comment = {
  id: string;
  match_id: string;
  user_id: string;
  author_name: string;
  text: string;
  created_at: string;
};

export type Profile = {
  user_id: string;
  display_name: string;
  invite_code: string;
  created_at: string;
};

export type Friendship = {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
};

export type RoomStatus = "waiting" | "active" | "closed";

export type Room = {
  id: string;
  code: string;
  host_id: string;
  guest_id: string | null;
  status: RoomStatus;
  created_at: string;
};

// Um prato concluído com tudo que a galeria precisa exibir.
export type GalleryDish = {
  match_id: string;
  photo_url: string;
  created_at: string;
  country_name: string;
  country_flag: string;
  confederation: string;
  dish: string;
  cook: string;
  caption: string | null;
  partnerId: string | null;
  partnerName: string | null;
  published: boolean;
  reviews: Review[];
  comments: Comment[];
  likes: Like[];
  mine: boolean;
};
