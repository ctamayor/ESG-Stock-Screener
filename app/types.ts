export interface Company {
  id: number;
  name: string;
  esg_ratings: {
    [category: string]: {
      rating: number;
      explanation: string;
      sources?: string[];
    };
  };
}
