# Database Directory

- This directory contains configuration, models, migrations, and schema definitions.
- It manages the connection to **MariaDB** and defines the data models (which map to tables in the relational database).

### Configuring the Database

To make the database operational, follow these initial setup steps.

#### Setup MariaDB

In order to properly setup MariaDB, the following steps are required:

1. Install MariaDB (if not already installed)  
   → [Download MariaDB](https://mariadb.com/kb/en/where-to-download-mariadb/)

2. It is strongly recommended that you [secure your MariaDB installation](https://mariadb.com/kb/en/mysql_secure_installation/). Run this command to remove anonymous users, disable remote root login, etc.:

   ```bash
   mariadb-secure-installation

   ```

3. [Start the `mariadb` server](https://mariadb.com/kb/en/starting-and-stopping-mariadb-automatically/).

- macOS (Homebrew): `brew services start mariadb`
- Windows: start via Services panel or command line

#### Apply the scripts

1. Go to the [/database/Scheme](/database/Scheme) directory.
   ```sh
   cd database/Scheme
   ```
2. [Run the `mariadb` client in batch mode](https://mariadb.com/kb/en/mariadb-command-line-client/). With `DB_USER` and `DB_USER_PASSWORD` being your created `mariadb` user and its password.
   1. Load database scheme [/database/Scheme/Scheme.sql](/database/Scheme/Scheme.sql).
      ```sh
      mariadb -u DB_USER -p DB_USER_PASSWORD < Scheme.sql
      ```
   2. Load database initial prepopulation [/database/Scheme/Prepopulate.sql](/database/Scheme/Prepopulate.sql).
      ```sh
      mariadb -u DB_USER -p DB_USER_PASSWORD < Prepopulate.sql
      ```
   3. Load database triggers [/database/Scheme/Triggers.sql](/database/Scheme/Triggers.sql).
      ```sh
      mariadb -u DB_USER -p DB_USER_PASSWORD < Triggers.sql
      ```
   4. Load database views [/database/Scheme/Views.sql](/database/Scheme/Views.sql).
      ```sh
      mariadb -u DB_USER -p DB_USER_PASSWORD < Views.sql
      ```
   5. Load database dummy data [/database/Scheme/Dummy.sql](/database/Scheme/Dummy.sql).
      ```sh
      mariadb -u DB_USER -p DB_USER_PASSWORD < Dummy.sql
      ```

### Environment Variables

Finally, it is crucial that a local `.env` file is created. Based off of the [`.env.example`](/.env.example) file provided, which includes all necessary environment variables to be set in order for the server to be able to connect to the `mariadb` database, as well as the required JSON Web Token(JWT) information required for verifying authorized requests and encryption.

1. Go to the [root directory](/) of your local repository.
2. Create your `.env` file based off of the [`.env.example`](/.env.example) file.
   ```sh
   cp .env.example .env
   ```
3. Edit the newly created `.env` file, and edit the required variables based on your previous [`mariadb` configuration](#configuring-the-database):

   ```sh
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=27017
   DB_NAME=travel_management  # Change this
   DB_USER=username  # Change this
   DB_PASSWORD=password  # Change this

   # Root User
   DB_ROOT_USER=root_username  # Change this
   DB_ROOT_PASSWORD=root_password  # Change this

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key  # Change this
   JWT_EXPIRES_IN=1d

   # API Keys (if needed)
   # API_KEY=your_api_key

   # Other Configuration
   # CORS_ORIGIN=http://localhost:3000
   ```
