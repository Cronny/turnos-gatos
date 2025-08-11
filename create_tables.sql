BEGIN TRANSACTION;

-- Usarios
CREATE TABLE users (
    id serial primary key,
    name text not null
);

-- Fechas
CREATE TABLE feeding_schedule (
    id serial primary key,
    feeding_date date not null unique,
    user_id int references users(id) on delete cascade
);

-- Insercion de usuarios
INSERT INTO users (name)
VALUES 
('Diego'),
('Diana'),
('Jesi');

-- Insercion de fechas iniciales
INSERT INTO feeding_schedule (feeding_date, user_id)
VALUES
('2025-08-09', 2),
('2025-08-10', 1);

COMMIT;
