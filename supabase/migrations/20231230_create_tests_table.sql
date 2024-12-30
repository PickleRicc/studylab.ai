-- Create the tests table if it doesn't exist
create or replace function public.create_tests_table_if_not_exists()
returns void
language plpgsql
security definer
as $$
begin
    if not exists (select from pg_tables where schemaname = 'public' and tablename = 'tests') then
        create table public.tests (
            id uuid default uuid_generate_v4() primary key,
            user_id uuid references auth.users(id) on delete cascade not null,
            content text not null,
            questions jsonb not null,
            config jsonb not null,
            created_at timestamp with time zone default timezone('utc'::text, now()) not null,
            updated_at timestamp with time zone default timezone('utc'::text, now()) not null
        );

        -- Add RLS policies
        alter table public.tests enable row level security;

        create policy "Users can insert their own tests"
            on public.tests for insert
            with check (auth.uid() = user_id);

        create policy "Users can view their own tests"
            on public.tests for select
            using (auth.uid() = user_id);

        -- Add indexes
        create index tests_user_id_idx on public.tests(user_id);
        create index tests_created_at_idx on public.tests(created_at);
    end if;
end;
$$;
