CREATE TABLE public.user
(
    id serial NOT NULL,
    spotify_profile_id text NOT NULL,
    spotify_access_token text NOT NULL,
    money numeric,
    datetime timestamp with time zone NOT NULL,
    PRIMARY KEY (id)
)

CREATE TABLE public.stat
(
    id serial NOT NULL,
    artist_id text NOT NULL,
    spotify_url text NOT NULL,
    monthly_listeners int,
    fetch_date_start timestamp NOT NULL,
    fetch_date_end timestamp NOT NULL,
    PRIMARY KEY (id)
)

CREATE TABLE public.bet
(
    id serial NOT NULL,
    user_id integer NOT NULL,
    artist_id text NOT NULL,
    spotify_url text NOT NULL,
    listeners integer NOT NULL,
    type text NOT NULL, 
    start_date timestamp NOT NULL,
    end_date timestamp NOT NULL,
    listeners_at_end_date integer,
    transactions boolean NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id)
        REFERENCES public.user (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

CREATE TABLE public.participant
(
    id serial NOT NULL,
    bet_id integer NOT NULL,
    user_id integer NOT NULL,
    support boolean NOT NULL,
    amount numeric NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (bet_id)
        REFERENCES public.bet (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    FOREIGN KEY (user_id)
        REFERENCES public.user (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

CREATE TABLE public.transaction
(
    id serial NOT NULL,
    user_id integer NOT NULL,
    amount numeric NOT NULL,
    type text NOT NULL,
    bet_id integer NOT NULL,
    datetime timestamp NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id)
        REFERENCES public.user (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    FOREIGN KEY (bet_id)
        REFERENCES public.bet (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)