export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: "admin" | "member";
  pin_is_set: boolean;
  active: boolean;
};

export type SessionProfile = {
  profile_id: string;
  display_name: string;
  role: "admin" | "member";
};
