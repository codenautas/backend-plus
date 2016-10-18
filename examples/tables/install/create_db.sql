create user beplus_example_user password 'beplus_example_3948812bdz';
create database beplus_example_db owner beplus_example_user;
\c beplus_example_db

drop schema if exists ext cascade;
create schema ext authorization beplus_example_user;
grant all on schema ext to beplus_example_user;

set search_path = ext;

create table ext.users(
  username text primary key,
  md5pass text,
  active_until date not null,
  locked_since date,
  rol text
);
alter table ext."users" owner to beplus_example_user;

insert into ext."users" (username, md5pass, rol, active_until)
  values ('bob', md5('bobpass'||'bob'), 'boss', '2099-12-31');

insert into ext."users" (username, md5pass, rol, active_until)
  values ('died', md5('diedpass'||'died'), 'boss', '1999-12-31');

insert into ext."users" (username, md5pass, rol, active_until,locked_since)
  values ('locked', md5('lockedpass'||'locked'), 'boss', '2999-12-31','2016-07-02');

insert into ext."users" (username, md5pass, rol, active_until)
  values ('mat', md5('matpass'||'mat'), 'user', '2099-12-31');

create table ext.pgroups(
  "group" text primary key,
  "class" text not null,
  "color" text
);
alter table ext.pgroups owner to beplus_example_user;
insert into ext.pgroups("group", "class") values
  ('Metalloid', 'Metalloids'),
  ('Other nonmetals', 'Nonmetals'),
  ('Halogens', 'Nonmetals'),
  ('Noble gas', 'Nonmetals'),
  ('Alkali metal', 'Metals'),
  ('Alkaline earth metal', 'Metals'),
  ('Lanthanide', 'Metals'),
  ('Actinide', 'Metals'),
  ('Transition metal', 'Metals'),
  ('Post-transition metal', 'Metals'),
  ('Diatomic nonmetal', 'Nonmetals'),
  ('Polyatomic nonmetal', 'Nonmetals');

create table ext.ptable(
  atomic_number        integer primary key,
  symbol               varchar(8) unique,
  name                 text not null,
  weight               numeric,
  "group"              text references pgroups("group"),
  discovered_date      date,
  discovered_precision text,
  bigbang              boolean,
  "column"             integer,
  period               integer,
  block                text,
  "state at STP"       text,
  ocurrence            text,
  description          text references ext.pgroups ("group")
);
alter table ext.ptable owner to beplus_example_user;

create function ext.ptable_state_camel_trg() returns trigger
  language plpgsql
as
$BODY$
declare
  v_camel_text text;
begin
  v_camel_text = upper(substr(new."state at STP", 1, 1)) || lower(substr(new."state at STP", 2));
  if v_camel_text is distinct from new."state at STP" then
    new."state at STP" = v_camel_text;
  end if;
  return new;
end;
$BODY$;
alter function ext.ptable_state_camel_trg() owner to beplus_example_user;

CREATE TRIGGER ptable_state_camel_trg
  BEFORE UPDATE OR INSERT
  ON ext.ptable
  FOR EACH ROW
  EXECUTE PROCEDURE ext.ptable_state_camel_trg();


insert into ext.ptable (atomic_number, name, symbol, "column", period, block, "state at STP", ocurrence, description) values
('1', 'Hydrogen', 'H', '1', '1', 's', 'Gas', 'Primordial', 'Diatomic nonmetal'),
('2', 'Helium', 'He', '18', '1', 's', 'Gas', 'Primordial', 'Noble gas'),
('3', 'Lithium', 'Li', '1', '2', 's', 'Solid', 'Primordial', 'Alkali metal'),
('4', 'Beryllium', 'Be', '2', '2', 's', 'Solid', 'Primordial', 'Alkaline earth metal'),
('5', 'Boron', 'B', '13', '2', 'p', 'Solid', 'Primordial', 'Metalloid'),
('6', 'Carbon', 'C', '14', '2', 'p', 'Solid', 'Primordial', 'Polyatomic nonmetal'),
('7', 'Nitrogen', 'N', '15', '2', 'p', 'Gas', 'Primordial', 'Diatomic nonmetal'),
('8', 'Oxygen', 'O', '16', '2', 'p', 'Gas', 'Primordial', 'Diatomic nonmetal'),
('9', 'Fluorine', 'F', '17', '2', 'p', 'Gas', 'Primordial', 'Diatomic nonmetal'),
('10', 'Neon', 'Ne', '18', '2', 'p', 'Gas', 'Primordial', 'Noble gas'),
('11', 'Sodium', 'Na', '1', '3', 's', 'Solid', 'Primordial', 'Alkali metal'),
('12', 'Magnesium', 'Mg', '2', '3', 's', 'Solid', 'Primordial', 'Alkaline earth metal'),
('13', 'Aluminium', 'Al', '13', '3', 'p', 'Solid', 'Primordial', 'Post-transition metal'),
('14', 'Silicon', 'Si', '14', '3', 'p', 'Solid', 'Primordial', 'Metalloid'),
('15', 'Phosphorus', 'P', '15', '3', 'p', 'Solid', 'Primordial', 'Polyatomic nonmetal'),
('16', 'Sulfur', 'S', '16', '3', 'p', 'Solid', 'Primordial', 'Polyatomic nonmetal'),
('17', 'Chlorine', 'Cl', '17', '3', 'p', 'Gas', 'Primordial', 'Diatomic nonmetal'),
('18', 'Argon', 'Ar', '18', '3', 'p', 'Gas', 'Primordial', 'Noble gas'),
('19', 'Potassium', 'K', '1', '4', 's', 'Solid', 'Primordial', 'Alkali metal'),
('20', 'Calcium', 'Ca', '2', '4', 's', 'Solid', 'Primordial', 'Alkaline earth metal'),
('21', 'Scandium', 'Sc', '3', '4', 'd', 'Solid', 'Primordial', 'Transition metal'),
('22', 'Titanium', 'Ti', '4', '4', 'd', 'Solid', 'Primordial', 'Transition metal'),
('23', 'Vanadium', 'V', '5', '4', 'd', 'Solid', 'Primordial', 'Transition metal'),
('24', 'Chromium', 'Cr', '6', '4', 'd', 'Solid', 'Primordial', 'Transition metal'),
('25', 'Manganese', 'Mn', '7', '4', 'd', 'Solid', 'Primordial', 'Transition metal'),
('26', 'Iron', 'Fe', '8', '4', 'd', 'Solid', 'Primordial', 'Transition metal'),
('27', 'Cobalt', 'Co', '9', '4', 'd', 'Solid', 'Primordial', 'Transition metal'),
('28', 'Nickel', 'Ni', '10', '4', 'd', 'Solid', 'Primordial', 'Transition metal'),
('29', 'Copper', 'Cu', '11', '4', 'd', 'Solid', 'Primordial', 'Transition metal'),
('30', 'Zinc', 'Zn', '12', '4', 'd', 'Solid', 'Primordial', 'Transition metal'),
('31', 'Gallium', 'Ga', '13', '4', 'p', 'Solid', 'Primordial', 'Post-transition metal'),
('32', 'Germanium', 'Ge', '14', '4', 'p', 'Solid', 'Primordial', 'Metalloid'),
('33', 'Arsenic', 'As', '15', '4', 'p', 'Solid', 'Primordial', 'Metalloid'),
('34', 'Selenium', 'Se', '16', '4', 'p', 'Solid', 'Primordial', 'Polyatomic nonmetal'),
('35', 'Bromine', 'Br', '17', '4', 'p', 'Liquid', 'Primordial', 'Diatomic nonmetal'),
('36', 'Krypton', 'Kr', '18', '4', 'p', 'Gas', 'Primordial', 'Noble gas'),
('37', 'Rubidium', 'Rb', '1', '5', 's', 'Solid', 'Primordial', 'Alkali metal'),
('38', 'Strontium', 'Sr', '2', '5', 's', 'Solid', 'Primordial', 'Alkaline earth metal'),
('39', 'Yttrium', 'Y', '3', '5', 'd', 'Solid', 'Primordial', 'Transition metal'),
('40', 'Zirconium', 'Zr', '4', '5', 'd', 'Solid', 'Primordial', 'Transition metal'),
('41', 'Niobium', 'Nb', '5', '5', 'd', 'Solid', 'Primordial', 'Transition metal'),
('42', 'Molybdenum', 'Mo', '6', '5', 'd', 'Solid', 'Primordial', 'Transition metal'),
('43', 'Technetium', 'Tc', '7', '5', 'd', 'Solid', 'Transient', 'Transition metal'),
('44', 'Ruthenium', 'Ru', '8', '5', 'd', 'Solid', 'Primordial', 'Transition metal'),
('45', 'Rhodium', 'Rh', '9', '5', 'd', 'Solid', 'Primordial', 'Transition metal'),
('46', 'Palladium', 'Pd', '10', '5', 'd', 'Solid', 'Primordial', 'Transition metal'),
('47', 'Silver', 'Ag', '11', '5', 'd', 'Solid', 'Primordial', 'Transition metal'),
('48', 'Cadmium', 'Cd', '12', '5', 'd', 'Solid', 'Primordial', 'Transition metal'),
('49', 'Indium', 'In', '13', '5', 'p', 'Solid', 'Primordial', 'Post-transition metal'),
('50', 'Tin', 'Sn', '14', '5', 'p', 'Solid', 'Primordial', 'Post-transition metal'),
('51', 'Antimony', 'Sb', '15', '5', 'p', 'Solid', 'Primordial', 'Metalloid'),
('52', 'Tellurium', 'Te', '16', '5', 'p', 'Solid', 'Primordial', 'Metalloid'),
('53', 'Iodine', 'I', '17', '5', 'p', 'Solid', 'Primordial', 'Diatomic nonmetal'),
('54', 'Xenon', 'Xe', '18', '5', 'p', 'Gas', 'Primordial', 'Noble gas'),
('55', 'Caesium', 'Cs', '1', '6', 's', 'Solid', 'Primordial', 'Alkali metal'),
('56', 'Barium', 'Ba', '2', '6', 's', 'Solid', 'Primordial', 'Alkaline earth metal'),
('57', 'Lanthanum', 'La', '3', '6', 'f', 'Solid', 'Primordial', 'Lanthanide'),
('58', 'Cerium', 'Ce', '3', '6', 'f', 'Solid', 'Primordial', 'Lanthanide'),
('59', 'Praseodymium', 'Pr', '3', '6', 'f', 'Solid', 'Primordial', 'Lanthanide'),
('60', 'Neodymium', 'Nd', '3', '6', 'f', 'Solid', 'Primordial', 'Lanthanide'),
('61', 'Promethium', 'Pm', '3', '6', 'f', 'Solid', 'Transient', 'Lanthanide'),
('62', 'Samarium', 'Sm', '3', '6', 'f', 'Solid', 'Primordial', 'Lanthanide'),
('63', 'Europium', 'Eu', '3', '6', 'f', 'Solid', 'Primordial', 'Lanthanide'),
('64', 'Gadolinium', 'Gd', '3', '6', 'f', 'Solid', 'Primordial', 'Lanthanide'),
('65', 'Terbium', 'Tb', '3', '6', 'f', 'Solid', 'Primordial', 'Lanthanide'),
('66', 'Dysprosium', 'Dy', '3', '6', 'f', 'Solid', 'Primordial', 'Lanthanide'),
('67', 'Holmium', 'Ho', '3', '6', 'f', 'Solid', 'Primordial', 'Lanthanide'),
('68', 'Erbium', 'Er', '3', '6', 'f', 'Solid', 'Primordial', 'Lanthanide'),
('69', 'Thulium', 'Tm', '3', '6', 'f', 'Solid', 'Primordial', 'Lanthanide'),
('70', 'Ytterbium', 'Yb', '3', '6', 'f', 'Solid', 'Primordial', 'Lanthanide'),
('71', 'Lutetium', 'Lu', '3', '6', 'd', 'Solid', 'Primordial', 'Lanthanide'),
('72', 'Hafnium', 'Hf', '4', '6', 'd', 'Solid', 'Primordial', 'Transition metal'),
('73', 'Tantalum', 'Ta', '5', '6', 'd', 'Solid', 'Primordial', 'Transition metal'),
('74', 'Tungsten', 'W', '6', '6', 'd', 'Solid', 'Primordial', 'Transition metal'),
('75', 'Rhenium', 'Re', '7', '6', 'd', 'Solid', 'Primordial', 'Transition metal'),
('76', 'Osmium', 'Os', '8', '6', 'd', 'Solid', 'Primordial', 'Transition metal'),
('77', 'Iridium', 'Ir', '9', '6', 'd', 'Solid', 'Primordial', 'Transition metal'),
('78', 'Platinum', 'Pt', '10', '6', 'd', 'Solid', 'Primordial', 'Transition metal'),
('79', 'Gold', 'Au', '11', '6', 'd', 'Solid', 'Primordial', 'Transition metal'),
('80', 'Mercury', 'Hg', '12', '6', 'd', 'Liquid', 'Primordial', 'Transition metal'),
('81', 'Thallium', 'Tl', '13', '6', 'p', 'Solid', 'Primordial', 'Post-transition metal'),
('82', 'Lead', 'Pb', '14', '6', 'p', 'Solid', 'Primordial', 'Post-transition metal'),
('83', 'Bismuth', 'Bi', '15', '6', 'p', 'Solid', 'Primordial', 'Post-transition metal'),
('84', 'Polonium', 'Po', '16', '6', 'p', 'Solid', 'Transient', 'Post-transition metal'),
('85', 'Astatine', 'At', '17', '6', 'p', 'Solid', 'Transient', 'Metalloid'),
('86', 'Radon', 'Rn', '18', '6', 'p', 'Gas', 'Transient', 'Noble gas'),
('87', 'Francium', 'Fr', '1', '7', 's', 'Solid', 'Transient', 'Alkali metal'),
('88', 'Radium', 'Ra', '2', '7', 's', 'Solid', 'Transient', 'Alkaline earth metal'),
('89', 'Actinium', 'Ac', '3', '7', 'f', 'Solid', 'Transient', 'Actinide'),
('90', 'Thorium', 'Th', '3', '7', 'f', 'Solid', 'Primordial', 'Actinide'),
('91', 'Protactinium', 'Pa', '3', '7', 'f', 'Solid', 'Transient', 'Actinide'),
('92', 'Uranium', 'U', '3', '7', 'f', 'Solid', 'Primordial', 'Actinide'),
('93', 'Neptunium', 'Np', '3', '7', 'f', 'Solid', 'Transient', 'Actinide'),
('94', 'Plutonium', 'Pu', '3', '7', 'f', 'Solid', 'Primordial', 'Actinide'),
('95', 'Americium', 'Am', '3', '7', 'f', 'Solid', 'Synthetic', 'Actinide'),
('96', 'Curium', 'Cm', '3', '7', 'f', 'Solid', 'Synthetic', 'Actinide'),
('97', 'Berkelium', 'Bk', '3', '7', 'f', 'Solid', 'Synthetic', 'Actinide'),
('98', 'Californium', 'Cf', '3', '7', 'f', 'Solid', 'Synthetic', 'Actinide'),
('99', 'Einsteinium', 'Es', '3', '7', 'f', 'Solid', 'Synthetic', 'Actinide'),
('100', 'Fermium', 'Fm', '3', '7', 'f', '', 'Synthetic', 'Actinide'),
('101', 'Mendelevium', 'Md', '3', '7', 'f', '', 'Synthetic', 'Actinide'),
('102', 'Nobelium', 'No', '3', '7', 'f', '', 'Synthetic', 'Actinide'),
('103', 'Lawrencium', 'Lr', '3', '7', 'd', '', 'Synthetic', 'Actinide'),
('104', 'Rutherfordium', 'Rf', '4', '7', 'd', '', 'Synthetic', 'Transition metal'),
('105', 'Dubnium', 'Db', '5', '7', 'd', '', 'Synthetic', 'Transition metal'),
('106', 'Seaborgium', 'Sg', '6', '7', 'd', '', 'Synthetic', 'Transition metal'),
('107', 'Bohrium', 'Bh', '7', '7', 'd', '', 'Synthetic', 'Transition metal'),
('108', 'Hassium', 'Hs', '8', '7', 'd', '', 'Synthetic', 'Transition metal'),
('109', 'Meitnerium', 'Mt', '9', '7', 'd', '', 'Synthetic', null),
('110', 'Darmstadtium', 'Ds', '10', '7', 'd', '', 'Synthetic', null),
('111', 'Roentgenium', 'Rg', '11', '7', 'd', '', 'Synthetic', null),
('112', 'Copernicium', 'Cn', '12', '7', 'd', '', 'Synthetic', 'Transition metal'),
('113', '(Ununtrium)', '(Uut)', '13', '7', 'p', '', 'Synthetic', null),
('114', 'Flerovium', 'Fl', '14', '7', 'p', '', 'Synthetic', 'Post-transition metal'),
('115', '(Ununpentium)', '(Uup)', '15', '7', 'p', '', 'Synthetic', null),
('116', 'Livermorium', 'Lv', '16', '7', 'p', '', 'Synthetic', null),
('117', '(Ununseptium)', '(Uus)', '17', '7', 'p', '', 'Synthetic', null),
('118', '(Ununoctium)', '(Uuo)', '18', '7', 'p', '', 'Synthetic', null);

update ext.ptable set weight= 1.008      ,discovered_date='1766-01-01', discovered_precision='year'   , bigbang=true  where atomic_number= 1;
update ext.ptable set weight= 4.002602   ,discovered_date='1895-03-26', discovered_precision='day'    , bigbang=true  where atomic_number= 2;
update ext.ptable set weight= 6.942      ,discovered_date='1817-01-01', discovered_precision='year'   , bigbang=true  where atomic_number= 3;
update ext.ptable set weight= 9.01218313 ,discovered_date='1797-01-01', discovered_precision='year'   , bigbang=false where atomic_number= 4;
update ext.ptable set weight=10.81       ,discovered_date='1766-01-01', discovered_precision='year'   , bigbang=false where atomic_number= 5;
update ext.ptable set weight=12.011      ,discovered_date=null        , discovered_precision='unknown', bigbang=false where atomic_number= 6;
update ext.ptable set weight=14.007      ,discovered_date='1772-01-01', discovered_precision='year'   , bigbang=false where atomic_number= 7;
update ext.ptable set weight=15.999      ,discovered_date='1774-01-01', discovered_precision='year'   , bigbang=false where atomic_number= 8;
update ext.ptable set weight=18.998403163,discovered_date='1886-06-26', discovered_precision='year'   , bigbang=false where atomic_number= 9;
update ext.ptable set weight=20.1797     ,discovered_date='1898-06-26', discovered_precision='year'   , bigbang=false where atomic_number=10;


create table ext."parameters"(
  only_one_record boolean not null primary key,
  full_log boolean not null default true,
  constraint only_one_record check (only_one_record is true)
);
alter table ext."parameters" owner to beplus_example_user;

insert into ext."parameters"(only_one_record) values (true);

create table ext.isotopes(
  atomic_number        integer,
  mass_number          integer,
  "order"              integer,
  stable               boolean default true,
  primary key (atomic_number, mass_number),
  unique (atomic_number, "order")
);
alter table ext.isotopes owner to beplus_example_user;

alter table ext.isotopes add constraint "atomic_number must be < mass_number" check (atomic_number < mass_number or atomic_number=1 and atomic_number <= mass_number);

insert into ext.isotopes(atomic_number, "order", mass_number) values
(2  ,1,4 ),
(2  ,2,3 ),
(4  ,1,9 ),
(6  ,1,12),
(6  ,2,13),
(8  ,1,16),
(8  ,2,18),
(8  ,3,17),
(10 ,1,20),
(10 ,2,22),
(10 ,3,21),
(1  ,1,1 ),
(1  ,2,2 ),
(3  ,1,7 ),
(3  ,2,6 ),
(5  ,1,11),
(5  ,2,10),
(7  ,1,14),
(7  ,2,15),
(9  ,1,19);

create table ext.element_images(
  atomic_number integer,
  kind text,
  mass_number integer default 0,
  url text,
  primary key (atomic_number, kind, mass_number)
);
alter table ext.element_images owner to beplus_example_user;

insert into ext.element_images(atomic_number, kind, url) values 
  (1,'atom','https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Protium.svg/170px-Protium.svg.png'),
  (1,'spectrum','https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Emission_spectrum-H.svg/500px-Emission_spectrum-H.svg.png'),
  (2,'spectrum','https://upload.wikimedia.org/wikipedia/commons/c/c3/Helium_spectra.jpg'),
  (2,'tube','https://upload.wikimedia.org/wikipedia/commons/c/c3/Helium_spectra.jpg'),
  (2,'atom','https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Blausen_0476_HeliumAtom.png/100px-Blausen_0476_HeliumAtom.png'),
  (3,'spectrum','https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Spectrum_Lines_of_Li.png/220px-Spectrum_Lines_of_Li.png'),
  (1,'crystal','https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Hexagonal.svg/50px-Hexagonal.svg.png'),
  (2,'crystal','https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Hexagonal_close_packed.svg/50px-Hexagonal_close_packed.svg.png'),
  (3,'crystal','https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Cubic-body-centered.svg/50px-Cubic-body-centered.svg.png'),
  (4,'crystal','https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Hexagonal_close_packed.svg/50px-Hexagonal_close_packed.svg.png');

insert into ext.element_images(atomic_number, kind, mass_number, url) values 
  (1,'tube',1,'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Hydrogen_discharge_tube.jpg/220px-Hydrogen_discharge_tube.jpg'),
  (2,'tube',2,'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Deuterium_discharge_tube.jpg/220px-Deuterium_discharge_tube.jpg');
