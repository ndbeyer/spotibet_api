### If your postgesql service crashed

1. brew services stop postgresql
2. get rid of `postmaster.pid` file via `rm /usr/local/var/postgres/postmaster.pid` adjust path accordingly to your installation directory
3. brew services start postgresql

### Connect to your local databases

- if you want to connect e.g. pgadmin to your `cinuru_local_dev`
- run `psql \l` in the terminal, to see your local databases (postgresql must be installed `brew install postgresql`)
- in pgadmin

  1. set Connection.username to whatever you can see in the column `Owner`
  2. set Connection.Host to `localhost`
  3. set Connection.database to `cinuru_local_dev` according to column `name`

* if you want to connect the local api to your `cinuru_local_dev`
* set the following in api/graphql-api-aws/.env.development
  1. set PGUSER= to whatever you can see in the column `Owner` e.g. PGUSER=peterpan
  2. PGHOST='localhost'
  3. PGDATABASE=cinuru_local_dev
  4. PGPASSWORD=''
