export interface Review {
  id: string;
  scenarioId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  rating: number;
  title: string;
  body: string;
  spoiler: boolean;
  createdAt: string;
  updatedAt: string;
}
