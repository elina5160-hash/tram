alter table contest_participants 
add column if not exists ticket_numbers text[] default array[]::text[];
