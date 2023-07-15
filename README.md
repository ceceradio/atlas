# atlas-commmunesoft

atlas, a world carrying environment

local.atlasai.zone

# folder structure

/
-/api (express)
-/next ()

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
6. `npm start`

# creating an organization and user from scratch

1. `cd api`
2. `npx ts-node ./src/cli registerOrganization`
3. use string from above command as input to `npx ts-node ./src/cli registerUser --uuid=`
4. follow the link in the terminal and use auth0 to log in.
