# TC3005B.501-Backend

API and Database for the conection and the functioning of the trip management system portal developed in course TC3005B by group 501.

## File Structure

```
TC3005B.501-Backend/
├─ index.js                    # Entry point of the application
├─ controllers/                # Controllers for handling API logic for different modules (accounts payable, admin, applicant, authorizer, file, travel agent, user)
├─ models/                     # Data models for database entities
├─ routes/                     # API route definitions for different endpoints
├─ services/                   # Business logic services for processing data and operations
├─ middleware/                 # Authentication, validation, rate limiting, decryption, and sanitization middleware
├─ database/                   # Database configuration, schemas, and initialization scripts
├─ openapi/                    # OpenAPI specifications for API documentation
├─ backup_scripts/             # Scripts for backing up MariaDB and MongoDB databases
├─ certs/                      # Scripts and configuration for generating HTTPS certificates
├─ email/                      # Email service utilities and templates
├─ CHANGELOG.md                # Changelog of project updates
├─ CONTRIBUTING.md             # Guidelines for contributing to the project
├─ mongodb_installation.md     # Instructions for MongoDB installation
├─ package.json                # Node.js dependencies and scripts
├─ pnpm-lock.yaml              # Lock file for pnpm package manager
└─ README.md                   # This file
```

---

## Getting Started

In order to run this Backend, the following steps are required:

### Installing

The only option currently is to clone the repository locally from GitHub.

#### Using `git`

```sh
git clone https://github.com/101-Coconsulting/TC3005B.501-Backend
```

#### Using `gh` (GitHub CLI)

```sh
gh repo clone 101-Coconsulting/TC3005B.501-Backend
```

### Dependencies

The dependencies for this project are managed using [the pnpm package manager](https://pnpm.io/), so it is recommended to use this. However, [npm](https://www.npmjs.com/) can also be used. The dependencies are automatically managed by `pnpm` in the `package.json` file, so they are installed automatically when issuing the install command.

#### Using `pnpm`

```sh
pnpm install
```

#### Using `npm`

```sh
npm install
```

### Create HTTPS certificates

To succesfully create the certificates to use the server with HTTPS you will need to follow the next steps:

#### Configuring OpenSSL

> [!Important]
> You have to download the `.cnf` file provided in SharePoint and place it in the [`/certs`](/certs) directory.

#### Generating keys and certificates

1. Access the [`/certs`](/certs) directory.

    ```sh
    cd certs
    ```

2. Run the next line of code in the terminal to ensure the [`/certs/create_certs.sh`](/certs/create_certs.sh) file is executable:

    ```sh
    chmod +x create_certs.sh
    ```

3. Run this line of code to create the certificates:

    ```sh
    ./create_certs.sh
    ```

Now you should have 6 new files in the [`/certs`](/certs) directory and should be able to run the server using HTTPS.

> [!Caution]
> After creating the certificates, when making a commit be sure not to be uploading the certificates to the repository.

### Configuring the Database

For the database to be operational, some initial configuration is required.

#### Setup MariaDB

In order to properly setup MariaDB, the following steps are required:

1. [Download `mariadb`](https://mariadb.com/kb/en/where-to-download-mariadb/).
2. It is recommended that you [secure your MariaDB installation](https://mariadb.com/kb/en/mysql_secure_installation/).
3. [Start the `mariadb` server](https://mariadb.com/kb/en/starting-and-stopping-mariadb-automatically/).
4. To setup the database with dummy data, run `pnpm dummy_db` or `node database/config/dev_db.js dev`from the root of the repository.
5. To setup only the database, run `pnpm empty_db` or `node database/config/init_db.js` from the root of the repository.

#### Manual MariaDB Setup

1. Go to the [/database/Scheme](/database/Scheme) directory.
    ```sh
    cd database/Scheme
    ```
2. [Run the `mariadb` client in batch mode](https://mariadb.com/kb/en/mariadb-command-line-client/). With `DB_USER` and `DB_USER_PASSWORD` being your created `mariadb` user and its password.
    i. Load database scheme [/database/Scheme/Scheme.sql](/database/Scheme/Scheme.sql).
        ```sh
        mariadb -u DB_USER -p DB_USER_PASSWORD < Scheme.sql
        ```
    ii. Load database initial prepopulation [/database/Scheme/Prepopulate.sql](/database/Scheme/Prepopulate.sql).
        ```sh
        mariadb -u DB_USER -p DB_USER_PASSWORD < Prepopulate.sql
        ```
    iii. Load database triggers [/database/Scheme/Triggers.sql](/database/Scheme/Triggers.sql).
        ```sh
        mariadb -u DB_USER -p DB_USER_PASSWORD < Triggers.sql
        ```
    iv. Load database views [/database/Scheme/Views.sql](/database/Scheme/Views.sql).
        ```sh
        mariadb -u DB_USER -p DB_USER_PASSWORD < Views.sql
        ```
    v. Load database dummy data [/database/Scheme/Dummy.sql](/database/Scheme/Dummy.sql).
        ```sh
        mariadb -u DB_USER -p DB_USER_PASSWORD < Dummy.sql
        ```

### Setup MongoDB

1. [Download `mongodb`](https://www.mongodb.com/docs/manual/installation/) using your preferred method or package manager.
2. [Download `mongosh`](https://www.mongodb.com/try/download/shell) if you want to interact with the database directly (recommended).
3. Test that mongo was installed correctly by running the `mongod` or `mongosh` command. `mongod` will usually return error codes since no connection is currently made to then database.
4. Verify that mongo is running using ` systemctl status mongod `
5. If the status appears as inactive, use the command ` systemctl start mongod `

### Setup Prisma

>[!Info]
>Prisma is an Object-Relational Mapping (ORM) tool used to interact with the `mariadb` database.
>
>It makes it easier to perform database queries by providing a higher-level API, as well as managing the database schema and migrations.
>
>To check additional information, check the [Prisma documentation](https://www.prisma.io/docs/prisma-orm/quickstart/mysql).

#### 1. Environment Variables

Setup the `DATABASE_URL` environment variables in your `.env` file to allow Prisma to connect to your `mariadb` database.

```
DATABASE_URL="mysql://travel_user:supersecret@localhost:3306/CocoScheme"
DATABASE_USER="travel_user"
DATABASE_PASSWORD="supersecret"
DATABASE_NAME="CocoScheme"
DATABASE_HOST="localhost"
DATABASE_PORT=3306
```

#### 2. Generate the Prisma Client

```sh
npx prisma generate
```

> [!Note]
> This step is required after any changes to the schema, which is located at [`/database/prisma/schema.prisma`](/database/prisma/schema.prisma).

#### 3. Run database migrations

>[!Info]
>**If you are running the project for the first time, you can skip this step.**
>
>Migrations are used to keep track of changes to the database schema over time. See it as a version control system for your database schema.

To create the initial migration based on the current Prisma schema:

```sh
npx prisma migrate deploy
```

To apply any pending migrations to your database:

```sh
npx prisma migrate deploy
```

Or to create a new migration file if you've modified the schema:

```sh
npx prisma migrate dev --name description_of_changes
```

#### 4. Seed the Database

To populate your database with only essential initial data, run the following:

```sh
npm run prisma:seed
```

To populate your database with dummy data for testing:

```sh
npm run prisma:seed:dummy
```

#### 5. Reset the Database

If you need to reset your database (deletes all data and re-applies all migrations):

```sh
npx prisma migrate reset
```

> [!Warning]
> This command will delete all data in your database. Use it only in development environments.

#### Useful Prisma Commands

| Command | Description |
|---------|-------------|
| `npm run prisma:seed` | Run the seed script with initial data |
| `npm run prisma:seed:dummy` | Run the seed script with dummy data |
| `npx prisma migrate dev --name <name>` | Create a new migration |
| `npx prisma migrate deploy` | Apply pending migrations |
| `npx prisma migrate reset` | Reset the database |

### Environment Variables

Finally, it is crucial that a local `.env` file is created. Based off of the [`.env.example`](/.env.example) file provided, which includes all necessary environment variables to be set in order for the server to be able to connect to the `mariadb` database, as well as the required JSON Web Token(JWT) information required for verifying authorized requests and encryption.

1. Go to the [root directory](/) of your local repository.
2. Create your `.env` file based off of the [`.env.example`](/.env.example) file.
    ```sh
    cp .env.example .env
    ```
3. Edit the newly created `.env` file, and edit the required variables based on your previous [`mariadb` configuration](#configuring-the-database) and `mongodb` configuration:
    ```sh
    # Server Configuration
    PORT=3000
    NODE_ENV=development
    FRONTEND_URL=https://localhost:4321
    BACKEND_URL=https://localhost:3000

    # Database Configuration
    DB_HOST=localhost
    DB_PORT=3306
    DB_NAME=travel_management # Change this
    DB_USER=username # Change this
    DB_PASSWORD=password # Change this

    # API Keys (if needed)
    # API_KEY=your_api_key

    # Other Configuration
    # CORS_ORIGIN=https://localhost:3000
    MONGO_URI=mongodb://localhost:27017

    # Keys to be replaced with the keys uploaded to the sharepoint
    # For the time-being feel free to add any string with that length
    AES_SECRET_KEY=<32 character key>
    AES_IV=<16 character key>
    JWT_SECRET=<key>

    # Please check the sharepoint folder certificates
    # and environment files for the real user and password
    MAIL_USER=test.mail@outlook.com
    MAIL_PASSWORD=password

    # This was inserted by `prisma init`:
    # Environment variables declared in this file are NOT automatically loaded by Prisma.
    # Please add `import "dotenv/config";` to your `prisma.config.ts` file, or use the Prisma CLI with Bun
    # to load environment variables from .env files: https://pris.ly/prisma-config-env-vars.

    # Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.
    # See the documentation for all the connection string options: https://pris.ly/d/connection-strings

    DATABASE_URL="mysql://username:password@localhost:3306/mydb"
    DATABASE_USER="username"
    DATABASE_PASSWORD="password"
    DATABASE_NAME="mydb"
    DATABASE_HOST="localhost"
    DATABASE_PORT=3306
    ```

## Email Configuration

This system utilizes gmail's SMTP server to send emails. In order to properly configure the email service, the following steps are required:

1. Create a new email account that will be used to send the emails from the system.

2. Enable 2-factor authentication for the email account.

3. Create an app password for the email account:

    - Go to https://myaccount.google.com/apppasswords and sign in with the email account you created in step 1.

    - Create a new app password by entering a name for the app (e.g., "my-app") and copy the generated password.

4. Update the environment variables as follows:

    - Set `MAIL_USER` to the email address of the account you created.

    - Set `MAIL_PASSWORD` to the app password you generated in step 3.

### Running

To run the Backend, ensure the `mariadb` and `mongodb` servers are running, and utilize whichever package manager you used for dependencies to run the project.

#### Using `pnpm`

```sh
pnpm run dev
```

#### Using `npm`

```sh
npm run dev
```

And you're good to go! `nodemon` should start and you should be able to start sending requests to your specified `PORT` on `localhost` as well as a confirmation message of connection to the file database!

### System Endpoints

The backend exposes operational endpoints under `/api/system` that do not require authentication:

- `GET /api/system/health`: Returns service health status, uptime, and metadata.
- `GET /api/system/version`: Returns service version metadata.

Example health response:

```json
{
  "status": "ok",
  "uptime_seconds": 31.46,
  "service": "tc3005b-501-backend",
  "version": "0.1.0",
  "timestamp": "2026-02-26T23:00:00.000Z"
}
```
