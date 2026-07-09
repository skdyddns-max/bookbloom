-- ============================================================
-- 북블룸 모임(독서모임 공유) 스키마 — keto-fridge 공유 프로젝트에 bb_ 접두사로 공존
--
-- 보안 모델 (FitMate와 동일):
--  · 참여 시 bb_members.token(uuid) 발급 → 클라이언트 기기에 저장
--  · 읽기: 공개 select (멤버 목록은 token 제외 뷰로만)
--  · 쓰기: 전부 token 검증 RPC (security definer) — 직접 insert/update 불가
--  · 방 코드(6자리)가 사실상의 비밀키
-- ============================================================

create table if not exists bb_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists bb_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references bb_rooms(id) on delete cascade,
  nickname text not null,
  token uuid not null default gen_random_uuid(),
  joined_at timestamptz default now(),
  unique (room_id, nickname)
);

create table if not exists bb_posts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references bb_rooms(id) on delete cascade,
  member_id uuid not null references bb_members(id) on delete cascade,
  book_title text not null default '',
  book_author text not null default '',
  cover_url text not null default '',
  kind text not null default 'thought' check (kind in ('review', 'quote', 'thought')),
  content text not null,
  rating numeric(2, 1) not null default 0,
  created_at timestamptz default now()
);

create table if not exists bb_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references bb_posts(id) on delete cascade,
  member_id uuid not null references bb_members(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists bb_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references bb_posts(id) on delete cascade,
  member_id uuid not null references bb_members(id) on delete cascade,
  unique (post_id, member_id)
);

-- ---------- RLS ----------
alter table bb_rooms enable row level security;
alter table bb_members enable row level security;
alter table bb_posts enable row level security;
alter table bb_comments enable row level security;
alter table bb_likes enable row level security;

drop policy if exists bb_sel_posts on bb_posts;
drop policy if exists bb_sel_comments on bb_comments;
drop policy if exists bb_sel_likes on bb_likes;
create policy bb_sel_posts on bb_posts for select using (true);
create policy bb_sel_comments on bb_comments for select using (true);
create policy bb_sel_likes on bb_likes for select using (true);
-- bb_rooms: 직접 select 불가 (코드로만 조회하는 RPC) — 방 목록 스캔 방지
-- bb_members: token 노출 방지 위해 뷰로만

create or replace view bb_members_public as
  select id, room_id, nickname, joined_at from bb_members;
grant select on bb_members_public to anon;

-- ---------- 헬퍼 ----------
create or replace function bb_assert_token(p_member uuid, p_token uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from bb_members where id = p_member and token = p_token) then
    raise exception 'INVALID_TOKEN';
  end if;
end;
$$;

-- ---------- RPC ----------
create or replace function bb_api_create_room(p_name text, p_nickname text)
returns jsonb language plpgsql security definer as $$
declare
  v_code text;
  v_room bb_rooms;
  v_member bb_members;
begin
  loop
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', floor(random() * 31)::int + 1, 1), '')
      into v_code from generate_series(1, 6);
    exit when not exists (select 1 from bb_rooms where code = v_code);
  end loop;
  insert into bb_rooms (code, name) values (v_code, trim(p_name)) returning * into v_room;
  insert into bb_members (room_id, nickname) values (v_room.id, trim(p_nickname)) returning * into v_member;
  return jsonb_build_object('room', to_jsonb(v_room), 'member', to_jsonb(v_member));
end;
$$;

create or replace function bb_api_join_room(p_code text, p_nickname text)
returns jsonb language plpgsql security definer as $$
declare
  v_room bb_rooms;
  v_member bb_members;
begin
  select * into v_room from bb_rooms where code = upper(trim(p_code));
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;
  begin
    insert into bb_members (room_id, nickname) values (v_room.id, trim(p_nickname)) returning * into v_member;
  exception when unique_violation then
    -- 같은 닉네임 재입장: 기기 분실 대비가 아니라 오타 방지용 — 새 토큰 재발급은 하지 않음
    raise exception 'NICKNAME_TAKEN';
  end;
  return jsonb_build_object('room', to_jsonb(v_room), 'member', to_jsonb(v_member));
end;
$$;

create or replace function bb_api_create_post(
  p_member uuid, p_token uuid,
  p_book_title text, p_book_author text, p_cover_url text,
  p_kind text, p_content text, p_rating numeric
)
returns jsonb language plpgsql security definer as $$
declare
  v_room uuid;
  v_post bb_posts;
begin
  perform bb_assert_token(p_member, p_token);
  if length(trim(p_content)) = 0 then
    raise exception 'EMPTY_CONTENT';
  end if;
  select room_id into v_room from bb_members where id = p_member;
  insert into bb_posts (room_id, member_id, book_title, book_author, cover_url, kind, content, rating)
    values (v_room, p_member, coalesce(trim(p_book_title), ''), coalesce(trim(p_book_author), ''),
            coalesce(p_cover_url, ''), p_kind, trim(p_content), coalesce(p_rating, 0))
    returning * into v_post;
  return to_jsonb(v_post);
end;
$$;

create or replace function bb_api_delete_post(p_member uuid, p_token uuid, p_post uuid)
returns void language plpgsql security definer as $$
begin
  perform bb_assert_token(p_member, p_token);
  delete from bb_posts where id = p_post and member_id = p_member;
end;
$$;

create or replace function bb_api_create_comment(p_member uuid, p_token uuid, p_post uuid, p_content text)
returns jsonb language plpgsql security definer as $$
declare v_comment bb_comments;
begin
  perform bb_assert_token(p_member, p_token);
  if length(trim(p_content)) = 0 then
    raise exception 'EMPTY_CONTENT';
  end if;
  insert into bb_comments (post_id, member_id, content) values (p_post, p_member, trim(p_content))
    returning * into v_comment;
  return to_jsonb(v_comment);
end;
$$;

create or replace function bb_api_delete_comment(p_member uuid, p_token uuid, p_comment uuid)
returns void language plpgsql security definer as $$
begin
  perform bb_assert_token(p_member, p_token);
  delete from bb_comments where id = p_comment and member_id = p_member;
end;
$$;

create or replace function bb_api_toggle_like(p_member uuid, p_token uuid, p_post uuid)
returns void language plpgsql security definer as $$
begin
  perform bb_assert_token(p_member, p_token);
  if exists (select 1 from bb_likes where post_id = p_post and member_id = p_member) then
    delete from bb_likes where post_id = p_post and member_id = p_member;
  else
    insert into bb_likes (post_id, member_id) values (p_post, p_member);
  end if;
end;
$$;

-- 방 전체 피드 (posts + 닉네임 + 좋아요수 + 댓글) 한 번에
create or replace function bb_api_get_feed(p_room uuid)
returns jsonb language plpgsql security definer as $$
begin
  return coalesce((
    select jsonb_agg(post_row order by post_row->>'created_at' desc)
    from (
      select to_jsonb(p) || jsonb_build_object(
        'nickname', m.nickname,
        'likes', (select count(*) from bb_likes l where l.post_id = p.id),
        'liked_by', (select coalesce(jsonb_agg(l.member_id), '[]'::jsonb) from bb_likes l where l.post_id = p.id),
        'comments', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', c.id, 'member_id', c.member_id, 'nickname', cm.nickname,
            'content', c.content, 'created_at', c.created_at
          ) order by c.created_at), '[]'::jsonb)
          from bb_comments c join bb_members cm on cm.id = c.member_id
          where c.post_id = p.id
        )
      ) as post_row
      from bb_posts p join bb_members m on m.id = p.member_id
      where p.room_id = p_room
    ) t
  ), '[]'::jsonb);
end;
$$;

grant execute on function bb_api_create_room(text, text) to anon;
grant execute on function bb_api_join_room(text, text) to anon;
grant execute on function bb_api_create_post(uuid, uuid, text, text, text, text, text, numeric) to anon;
grant execute on function bb_api_delete_post(uuid, uuid, uuid) to anon;
grant execute on function bb_api_create_comment(uuid, uuid, uuid, text) to anon;
grant execute on function bb_api_delete_comment(uuid, uuid, uuid) to anon;
grant execute on function bb_api_toggle_like(uuid, uuid, uuid) to anon;
grant execute on function bb_api_get_feed(uuid) to anon;
