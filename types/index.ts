
export type NoteItem = {
  id: string;
  title: string;
  content: string;
  color: string;
  dateLabel: string;
  timeLabel: string;
  role: "owner" | "editor" | "viewer";
  isPublic: boolean; 
  publicSlug: string | null;
  initialShareMode: "public" | "team" | "private";
  initialTeam: { id: string; email: string; name: string | null } | null;
  slug: string | null;
  commentsCount: number;
  collaborators: {
    role: "owner" | "editor" | "viewer";
    user: { id: string; email: string; name: string | null };
  }[];
};


export type NoteCardProps = {
  noteId: string;
  title: string;
  content: string;
  dateLabel: string;
  timeLabel: string;
  colorClass?: string;
  className?: string;
  role?: Role;

  initialShareMode?: "private" | "team" | "public";
  initialTeam?: { id: string; email: string; name?: string | null } | null;
  publicSlug?: string | null;

  onEdit?: () => void;
  onDelete?: () => Promise<void> | void;
  onShareSubmit?: (
    noteId: string,
    payload: { mode: ShareChoice; teamUserId?: string | null }
  ) => Promise<{ slug?: string } | void>;

  commentCount?: number;
  canComment?: boolean;
};


export type Role = "owner" | "editor" | "viewer";
export type ShareChoice = "private" | "team" | "public";


export type UserOption = {
  id: string;
  email: string;
  name: string | null;
};

export type ShareState = {
  slug?: string;
  mode?: "public" | "team" | "private";
  team?: { id: string; email: string; name?: string | null };
}

export type Comment = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

export type CommentItem = {
  id: string;
  body: string;
  authorName: string;
  canComment: boolean;
  createdAt: string; // ISO
};

export type CreateNotePayload = {
  title: string;
  content: string;
  color?: string | null;
  shareMode?: ShareChoice;
  teamUserId?: string | null;
};
export type CreateNoteResult = { id: string; slug?: string };

export type UpdateNotePayload = {
  title?: string;
  content?: string;
  color?: string | null;
  shareMode?: ShareChoice;
  teamUserId?: string | null;
}