

export type Notification = {
    id: string;
    user_id: string;
    title: string;
    description: string;
    link: string;
    is_read: boolean;
    created_at: string;
};

export type IssueStatus = "Pending" | "In Progress" | "Resolved" | "Rejected" | "Redirected";

export type IssueCategory = "Water" | "Electricity" | "Roads" | "Waste" | "Other";

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  timestamp: Date;
  user_id: string;
}

export interface TimelineEvent {
    status: IssueStatus | string;
    date: string;
    notes?: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  summary: string;
  category: IssueCategory;
  status: IssueStatus;
  urgency_score: number;
  location: {
    lat: number;
    lng: number;
  } | null;
  address: string;
  imageUrls: string[]; 
  reportedBy: string;
  reportedAt: Date;
  upvotes: number;
  downvotes: number;
  comments: Comment[];
  comment_count?: number;
  department: string;
  timeline: TimelineEvent[];
}

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  points: number;
  email?: string;
  contact_number?: string;
  address?: string;
  badges?: string[];
  role?: 'citizen' | 'admin';
}
