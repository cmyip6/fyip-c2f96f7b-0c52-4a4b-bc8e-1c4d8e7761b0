# TaskManagement

Thank you so much for taking the time to review my project! Please follow the instructions below to set up the testing environment.

# Prerequisites

* **Docker** (with Docker Engine running)
* **Node.js** (via `nvm`)

## Setting up environment

1.  Start the Docker engine.

2.  Clone this repo to your local machine and `cd` into the root directory.

3.  Run this command to install packages for all applications:

    ```sh
    npm run install-all
    ```

4.  Set up the Docker database:

    ```sh
    npm run api:db:setup
    ```

    > To drop the db later, run:
    > ```sh
    > npm run api:db:setdown
    > ```

# Starting API + Client

1.  **Environment Variables**: Before starting, copy all variables from `env.example` to `.env` and make sure all of them are set.

    > **⚠️ Important:** Please set `DROP_SCHEMA`, `RUN_MIGRATIONS`, and `RUN_SEEDS` to `true` for the first run. The process will automatically run all migrations and seed data.

2.  Run the API:

    ```sh
    npm run start:api
    ```

3.  Run the Client:
    *(**Note:** Please make sure all envs are set at this point as they will be referenced to generate a copy for some front-end logic)*

    ```sh
    npm run start:dashboard
    ```

4.  Navigate to http://localhost:4200 and you should see the app is up and running!

## For testing the feature

Please use the following users for your testing purposes. They are automatically seeded when you set `RUN_SEEDS` to `true` before you start the API.

### Users for testing

| Username | Password | Permission (Parent Org) | Permission (Child Org) |
| :--- | :--- | :--- | :--- |
| **user1** | `Password!!` | **Owner** | Admin |
| **user2** | `Password!!` | **Admin** | Owner |
| **user3** | `Password!!` | **Viewer** | *No Role* |

## Feature Highlights

1.  **Authentication:** Login page with token control. Once a user logs in, a token will be saved to a cookie for injecting into the headers of all subsequent requests. Upon token expiration, the user will be logged out upon performing actions.
    * *Testing Tip:* You can set `TOKEN_LIFE_SECONDS` to `20` seconds and re-login the user. The user should be logged out when performing any actions after 10 seconds (due to a 10-second buffer).

2.  **Dashboard:** Once the user successfully logs in, the page will be redirected to a dashboard where the user can perform task-related actions (Read, Create, Update & Delete). Each action has its own guard and restrictions, and each restriction is linked to the role of the user in each organization.

3.  **Topbar:**
    * **Organization Dropdown:** Allows changing organizations (2 organizations are seeded). Users without permissions assigned to the role, or without a role assigned to the user, will not be able to see the organization in the dropdown list.
    * **Profile:** On the right, there is a profile button leading to a modal where the user can view their information (including their role in the selected organization) and perform logout actions.

4.  **Task Card:** From the dashboard, the user can create a task by clicking the "Initialize Task" button. Once the task is created, the user will be able to:
    * Search task by title at the search input. Pagination supported.     
    * Update the status via the dropdown menu on the task card. Reordering by drag and drop
    * Delete the card by clicking on the cross sign at the corner and confirming via the pop-up modal.

## Permissions & Guards

As explained above, all API actions are guarded by different permission controls:

1.  **JWT Guards:** Token must be present and valid.
2.  **Roles Guard:** Role required to access certain endpoints.
3.  **Policy Guard:** Checks the permission level (Create, Update, Read, Delete) associated with the role in the organization.
4.  **Response Validation:** A response validation interceptor was implemented to ensure response DTOs match the defined structure.

*Note: Current implementation is only focusing on task-related control.*

### Logic Examples:

1.  User with **Owner** role in Organization A can perform all actions for a task.
2.  **Admin** can Read, Update, and Create tasks, but cannot Delete.
3.  **Viewer** can only Read tasks.
4.  The same user can have different roles in other organizations.
5.  Permissions associated with a role can be changed (e.g., Admin can be granted delete permissions if defined in the DB).

## Features to be implemented

Due to time limits, there are some missing parts planned but not yet implemented:

1.  **Logging middleware:** Saving action logs for each user, allowing viewing and archiving from the UI.
2.  **E2E testing:** Create a testing app with the exact same env as the application to perform real CRUD actions and validate against a testing DB, without mocking any of the functions or services.
