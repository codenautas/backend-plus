-- DROP TABLE bep.datos;

CREATE TABLE bep.datos
(
  username text,
  idencuesta character varying NOT NULL,
  variable character varying,
  valor character varying,
  CONSTRAINT encuesta_pk PRIMARY KEY (idencuesta),
  CONSTRAINT username_fk FOREIGN KEY (username)
      REFERENCES bep.users (username) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION
)
WITH (
  OIDS=FALSE
);
ALTER TABLE bep.datos
  OWNER TO postgres;
