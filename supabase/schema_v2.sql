-- ============================================================
-- 북블룸 모임 v2 — 함께 읽는 책 (bb_ 접두사, 기존 테이블 불변)
-- 보안 모델 동일: 읽기 공개 select, 쓰기는 token 검증 RPC만
-- ============================================================

create table if not exists bb_room_books (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references bb_rooms(id) on delete cascade,
  book_title text not null,
  book_author text not null default '',
  cover_url text not null default '',
  total_pages int not null default 0,
  due_date date,
  status text not null default 'active' check (status in ('active', 'done')),
  created_by uuid not null references bb_members(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists bb_room_progress (
  id uuid primary key default gen_random_uuid(),
  room_book_id uuid not null references bb_room_books(id) on delete cascade,
  member_id uuid not null references bb_members(id) on delete cascade,
  page int not null default 0,
  updated_at timestamptz default now(),
  unique (room_book_id, member_id)
);

alter table bb_room_books enable row level security;
alter table bb_room_progress enable row level security;

drop policy if exists bb_sel_room_books on bb_room_books;
drop policy if exists bb_sel_room_progress on bb_room_progress;
create policy bb_sel_room_books on bb_room_books for select using (true);
create policy bb_sel_room_progress on bb_room_progress for select using (true);

-- 함께 읽는 책 지정 (기존 active는 done 처리)
create or replace function bb_api_set_room_book(
  p_member uuid, p_token uuid,
  p_title text, p_author text, p_cover text, p_pages int, p_due date
)
returns jsonb language plpgsql security definer as $$
declare
  v_room uuid;
  v_book bb_room_books;
begin
  perform bb_assert_token(p_member, p_token);
  if length(trim(p_title)) = 0 then
    raise exception 'EMPTY_CONTENT';
  end if;
  select room_id into v_room from bb_members where id = p_member;
  update bb_room_books set status = 'done' where room_id = v_room and status = 'active';
  insert into bb_room_books (room_id, book_title, book_author, cover_url, total_pages, due_date, created_by)
    values (v_room, trim(p_title), coalesce(trim(p_author), ''), coalesce(p_cover, ''),
            greatest(coalesce(p_pages, 0), 0), p_due, p_member)
    returning * into v_book;
  return to_jsonb(v_book);
end;
$$;

-- 함께 읽기 종료 (active → done)
create or replace function bb_api_close_room_book(p_member uuid, p_token uuid, p_room_book uuid)
returns void language plpgsql security definer as $$
declare v_room uuid;
begin
  perform bb_assert_token(p_member, p_token);
  select room_id into v_room from bb_members where id = p_member;
  update bb_room_books set status = 'done' where id = p_room_book and room_id = v_room;
end;
$$;

-- 내 진도 갱신
create or replace function bb_api_update_room_progress(p_member uuid, p_token uuid, p_room_book uuid, p_page int)
returns void language plpgsql security definer as $$
begin
  perform bb_assert_token(p_member, p_token);
  insert into bb_room_progress (room_book_id, member_id, page, updated_at)
    values (p_room_book, p_member, greatest(coalesce(p_page, 0), 0), now())
    on conflict (room_book_id, member_id)
    do update set page = greatest(coalesce(p_page, 0), 0), updated_at = now();
end;
$$;

-- 현재 함께 읽는 책 + 멤버 진도 현황
create or replace function bb_api_get_room_book(p_room uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_book bb_room_books;
begin
  select * into v_book from bb_room_books
    where room_id = p_room and status = 'active'
    order by created_at desc limit 1;
  if not found then
    return null;
  end if;
  return to_jsonb(v_book) || jsonb_build_object(
    'progress', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'member_id', m.id, 'nickname', m.nickname,
        'page', coalesce(rp.page, 0), 'updated_at', rp.updated_at
      ) order by coalesce(rp.page, 0) desc, m.joined_at), '[]'::jsonb)
      from bb_members m
      left join bb_room_progress rp on rp.member_id = m.id and rp.room_book_id = v_book.id
      where m.room_id = p_room
    )
  );
end;
$$;

grant execute on function bb_api_set_room_book(uuid, uuid, text, text, text, int, date) to anon;
grant execute on function bb_api_close_room_book(uuid, uuid, uuid) to anon;
grant execute on function bb_api_update_room_progress(uuid, uuid, uuid, int) to anon;
grant execute on function bb_api_get_room_book(uuid) to anon;
