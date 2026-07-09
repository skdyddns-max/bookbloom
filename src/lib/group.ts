import { supabase } from './supabase'

export interface GroupSession {
  roomId: string
  roomName: string
  code: string
  memberId: string
  nickname: string
  token: string
}

export interface FeedComment {
  id: string
  member_id: string
  nickname: string
  content: string
  created_at: string
}

export interface FeedPost {
  id: string
  member_id: string
  nickname: string
  book_title: string
  book_author: string
  cover_url: string
  kind: 'review' | 'quote' | 'thought'
  content: string
  rating: number
  created_at: string
  likes: number
  liked_by: string[]
  comments: FeedComment[]
}

export interface RoomBookProgress {
  member_id: string
  nickname: string
  page: number
  updated_at: string | null
}

export interface RoomBook {
  id: string
  book_title: string
  book_author: string
  cover_url: string
  total_pages: number
  due_date: string | null
  status: 'active' | 'done'
  progress: RoomBookProgress[]
}

export interface PostDraft {
  bookTitle: string
  bookAuthor: string
  coverUrl: string
  kind: 'review' | 'quote' | 'thought'
  content: string
  rating: number
}

const SESSION_KEY = 'bookbloom_group'
const DRAFT_KEY = 'bookbloom_group_draft'

export function getGroupSession(): GroupSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as GroupSession) : null
  } catch {
    return null
  }
}

export function saveGroupSession(s: GroupSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s))
}

export function clearGroupSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function setPostDraft(d: Partial<PostDraft>) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
}

export function takePostDraft(): Partial<PostDraft> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    localStorage.removeItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function toSession(payload: {
  room: { id: string; name: string; code: string }
  member: { id: string; nickname: string; token: string }
}): GroupSession {
  return {
    roomId: payload.room.id,
    roomName: payload.room.name,
    code: payload.room.code,
    memberId: payload.member.id,
    nickname: payload.member.nickname,
    token: payload.member.token,
  }
}

function friendlyError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('ROOM_NOT_FOUND')) return new Error('그 코드의 모임을 찾지 못했어요. 코드를 다시 확인해 주세요.')
  if (msg.includes('NICKNAME_TAKEN')) return new Error('이미 있는 닉네임이에요. 다른 닉네임으로 참여해 주세요.')
  if (msg.includes('INVALID_TOKEN')) return new Error('멤버 확인에 실패했어요. 모임에 다시 참여해 주세요.')
  if (msg.includes('EMPTY_CONTENT')) return new Error('내용을 입력해 주세요.')
  return new Error('연결에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.')
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('모임 기능이 아직 연결되지 않았어요.')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw friendlyError(new Error(error.message))
  return data as T
}

export const groupApi = {
  async createRoom(name: string, nickname: string): Promise<GroupSession> {
    const payload = await rpc<Parameters<typeof toSession>[0]>('bb_api_create_room', {
      p_name: name,
      p_nickname: nickname,
    })
    const s = toSession(payload)
    saveGroupSession(s)
    return s
  },
  async joinRoom(code: string, nickname: string): Promise<GroupSession> {
    const payload = await rpc<Parameters<typeof toSession>[0]>('bb_api_join_room', {
      p_code: code,
      p_nickname: nickname,
    })
    const s = toSession(payload)
    saveGroupSession(s)
    return s
  },
  async getFeed(roomId: string): Promise<FeedPost[]> {
    return rpc<FeedPost[]>('bb_api_get_feed', { p_room: roomId })
  },
  async createPost(s: GroupSession, d: PostDraft): Promise<void> {
    await rpc('bb_api_create_post', {
      p_member: s.memberId,
      p_token: s.token,
      p_book_title: d.bookTitle,
      p_book_author: d.bookAuthor,
      p_cover_url: d.coverUrl,
      p_kind: d.kind,
      p_content: d.content,
      p_rating: d.rating,
    })
  },
  async deletePost(s: GroupSession, postId: string): Promise<void> {
    await rpc('bb_api_delete_post', { p_member: s.memberId, p_token: s.token, p_post: postId })
  },
  async createComment(s: GroupSession, postId: string, content: string): Promise<void> {
    await rpc('bb_api_create_comment', {
      p_member: s.memberId,
      p_token: s.token,
      p_post: postId,
      p_content: content,
    })
  },
  async deleteComment(s: GroupSession, commentId: string): Promise<void> {
    await rpc('bb_api_delete_comment', { p_member: s.memberId, p_token: s.token, p_comment: commentId })
  },
  async toggleLike(s: GroupSession, postId: string): Promise<void> {
    await rpc('bb_api_toggle_like', { p_member: s.memberId, p_token: s.token, p_post: postId })
  },
  async getRoomBook(roomId: string): Promise<RoomBook | null> {
    return rpc<RoomBook | null>('bb_api_get_room_book', { p_room: roomId })
  },
  async setRoomBook(
    s: GroupSession,
    b: { title: string; author: string; coverUrl: string; totalPages: number; dueDate: string | null },
  ): Promise<void> {
    await rpc('bb_api_set_room_book', {
      p_member: s.memberId,
      p_token: s.token,
      p_title: b.title,
      p_author: b.author,
      p_cover: b.coverUrl,
      p_pages: b.totalPages,
      p_due: b.dueDate,
    })
  },
  async closeRoomBook(s: GroupSession, roomBookId: string): Promise<void> {
    await rpc('bb_api_close_room_book', { p_member: s.memberId, p_token: s.token, p_room_book: roomBookId })
  },
  async updateRoomProgress(s: GroupSession, roomBookId: string, page: number): Promise<void> {
    await rpc('bb_api_update_room_progress', {
      p_member: s.memberId,
      p_token: s.token,
      p_room_book: roomBookId,
      p_page: page,
    })
  },
}
