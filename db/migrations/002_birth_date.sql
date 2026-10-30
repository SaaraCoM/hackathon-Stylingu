-- Fecha de nacimiento para aplicar la edad mínima de registro.
-- Las cuentas anteriores pueden conservarla vacía; las nuevas la exigen en la API.
alter table users add column if not exists birth_date date;
