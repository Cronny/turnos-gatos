create or replace function create_daily_feeding()
returns void as $$
declare
    today date := current_date;
    chosen_user_id int;
    last_user_id int;
    cycle_length int;
    days_passed int;
begin
    -- 1. Evitar duplicados
    if exists (select 1 from feeding_schedule where feeding_date = today) then
        return;
    end if;

    -- 2. Revisar si hoy está dentro de un feeding_period
    select user_id
    into chosen_user_id
    from feeding_periods
    where today between start_date and end_date
    limit 1;

    if chosen_user_id is not null then
        -- Caso: feeding_period vigente
        insert into feeding_schedule (feeding_date, user_id)
        values (today, chosen_user_id);
        return;
    end if;

    -- Obtener el último usuario registrado
    select user_id
    into last_user_id
    from feeding_schedule
    where feeding_date = today - 1;

    -- Reiniciar el ciclo con el otro usuario
    select id
    into chosen_user_id
    from users
    where id <> last_user_id and id <> 3
    limit 1;

    insert into feeding_schedule (feeding_date, user_id)
    values (today, chosen_user_id);
    return;

end;
$$ language plpgsql security definer;
