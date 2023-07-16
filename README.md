# atlas-commmunesoft

atlas, a world carrying environment

# requirements

nvm
node18
docker
ext prettier-vscode
ext eslint

# setup

1. `npm install`
2. `npm run setup`
3. prepare an auth0 app/api and openai key
4. create and fill `./api/.env` (create it by copying `./api/.env.template`)
5. create and fill `./next/.env.local` (create it by copying `./next/.env.template`)
6. `npm start` and open [](https://local.atlasai.zone)
7. Next you'll need to create an organization and user to use Atlas.

# starting atlas

atlas requires multiple pieces of software to run. in order to assist, the root package.json is equipped with some helper scripts. `start` and `reset` can be used to start and reset the local development environment. once the software has started, direct your browser to [](https://local.atlasai.zone).

this is too early for production, but if you were going to run it in production at scale, you'd likely want to deploy it with different scripts.

# creating an organization and user on cold start

1. `cd api`
2. `npx ts-node ./src/cli registerOrganization`
3. use string from above command as input to `npx ts-node ./src/cli registerUser --uuid=`
4. follow the link in the terminal and use auth0 to log in.

# folder map

hopefully this map helps you find your way.

```
/
-/api (express)
--/src
---/app (express apps)
---/atlas (atlas API functions)
---/cli (cli commmands)
---/entity (typeorm entities)
---/interface (ts types for typeorm, exported by package)
---/migration (generated, probably dont need to change)
---/queue (bull queues)
---/ws (websocket server)
---datasource.ts (postgres connection)
-/next (what it says on the tin)
-/nginx (configuration)
```

# migrations

`npm run make-migration` will generate a migration based on the current state of the entities. development mode will sync changes from `./api/src/entity/` to the database automatically.

you probably don't need this feature unless you are working with a production environment that wont be synchronized. currently that is not configurable.
