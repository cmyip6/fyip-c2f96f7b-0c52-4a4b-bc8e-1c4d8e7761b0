# TaskManagement

Thank you so much for taking the time to review my project! Please follow the instructions below to set up the testing environment.

# Prerequisites

- **Docker** (with Docker Engine running)
- **Node.js** (via `nvm`)

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
    >
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
    _(**Note:** Please make sure all envs are set at this point as they will be referenced to generate a copy for some front-end logic)_

    ```sh
    npm run start:dashboard
    ```

4.  Navigate to http://localhost:4200 and you should see the app is up and running!

# Architecture Overview

This project utilizes an Nx Monorepo structure to ensure code sharing, type safety, and separation of concerns.

### Layout Strategy

root/
├── apps/
│   ├── api/                # NestJS Backend application
│   └── dashboard/          # Angular Frontend application
├── libs/
│   ├── data/               # Shared Types, DTOs, and Constants
│   └── auth/               # Shared Authentication Utilities
├── tools/                  # Scripts (e.g., environment generation)
└── nx.json                 # Monorepo configuration

## Rationale
1. **Single Source of Truth:** The libs/data library contains TypeScript interfaces used by both the API (to define Entities) and the Frontend (to type HTTP responses). If    the API changes, the Frontend build fails immediately, preventing runtime errors.

2. **Modular Design:** Authentication logic is isolated, making it easier to test or extract into a microservice later.

3. **Atomic Deployment:** While code is shared, apps are built independently. We can deploy the api to a Node server and dashboard to an S3 bucket/CDN without coupling.

# Data Model Explanation

### The database schema is designed for multi-tenancy, allowing users to belong to organizations with specific roles.

### erDiagram

    Organization {
        string id PK
        string name
        string description
    }

    User {
        string id PK
        string username
        string passwordHash
        enum role "ADMIN | USER"
        string organizationId FK
    }

    Task {
        string id PK
        string title
        string description
        enum status "OPEN | IN_PROGRESS | DONE"
        date createdAt
        int order
        string assignedToId FK
        string organizationId FK
    }

**Organization**: The top-level tenant. Data isolation is enforced at this level.

**User**: Belongs to one Organization. Holds a Role (ADMIN or USER) specific to that organization.

**Task**: The core unit of work. Linked to both an Organization (for ownership) and a User (for assignment).

# API Documentation

## Authentication
| Method   | Endpoint       | Description                       | Payload                                    |
| -------- | -------------- | --------------------------------- | ------------------------------------------ |
| **POST** | `/auth/login`  | Authenticate user & return token  | `{ "username": "...", "password": "..." }` |
| **POST** | `/auth/logout` | Invalidate session (cookie-based) | `{}`                                       |

## User & Organization
| Method  | Endpoint        | Description                        |
| ------- | --------------- | ---------------------------------- |
| **GET** | `/user`         | Get current authenticated user     |
| **GET** | `/organization` | Get organizations assigned to user |

## Task
| Method     | Endpoint                 | Description                | Query / Body                                   |
| ---------- | ------------------------ | -------------------------- | ---------------------------------------------- |
| **GET**    | `/task/organization/:id` | Get paginated tasks        | `?pageNumber=1&pageSize=9&search=...`          |
| **POST**   | `/task`                  | Create a new task          | Body: `{ title, description, organizationId }` |
| **PATCH**  | `/task/:id`              | Update task (status/order) | Body: `{ status: "DONE" }` or `{ index: 2 }`   |
| **DELETE** | `/task/:id`              | Delete task ( sofe )       | —                                              |

## Sample Response — Get Tasks
{
  "data": [
    {
      "id": "123-abc",
      "title": "Review PR",
      "status": "OPEN",
      "assignedToId": "user-1"
    }
  ],
  "metadata": {
    "totalRecords": 45,
    "pageNumber": 1,
    "pageSize": 10
  }
}


# For testing the feature

Please use the following users for your testing purposes. They are automatically seeded when you set `RUN_SEEDS` to `true` before you start the API.

### Users for testing

| Username  | Password     | Permission (Parent Org) | Permission (Child Org) |
| :-------- | :----------- | :---------------------- | :--------------------- |
| **user1** | `Password!!` | **Owner**               | Admin                  |
| **user2** | `Password!!` | **Admin**               | Owner                  |
| **user3** | `Password!!` | **Viewer**              | _No Role_              |

## Feature Highlights

1.  **Authentication:** Login page with token control. Once a user logs in, a token will be saved to a cookie for injecting into the headers of all subsequent         requests. Upon token expiration, the user will be logged out upon performing actions.
    - _Testing Tip:_ You can set `TOKEN_LIFE_SECONDS` to `20` seconds and re-login the user. The user should be logged out when performing any actions after 10 seconds     (due to a 10-second buffer).

2.  **Dashboard:** Once the user successfully logs in, the page will be redirected to a dashboard where the user can perform task-related actions (Read, Create, Update     & Delete). Each action has its own guard and restrictions, and each restriction is linked to the role of the user in each organization.

3.  **Topbar:**
    - **Organization Dropdown:** Allows changing organizations (2 organizations are seeded). Users without permissions assigned to the role, or without a role assigned     to the user, will not be able to see the organization in the dropdown list.
    - **Profile:** On the right, there is a profile button leading to a modal where the user can view their information (including their role in the selected organization) and perform logout actions.

4.  **Task Card:** From the dashboard, the user can create a task by clicking the "Initialize Task" button. Once the task is created, the user will be able to:
    - Search task by title at the search input. Pagination supported.
    - Update the status via the dropdown menu on the task card. Reordering by drag and drop
    - Delete the card by clicking on the cross sign at the corner and confirming via the pop-up modal.

## Access Control Implementation

As explained above, all API actions are guarded by different permission controls:

1. **Organization Hierarchy:**

1.  **JWT Guards:** Token must be present and valid. See jwtAuthGuard interceptor
2.  **Roles Guard:** Role required to access certain endpoints. See  @Roles() decorator 
3.  **Policy Guard:** Checks the permission level (Create, Update, Read, Delete) associated with the role in the organization. See @CheckPolicies() decorator
4.  **Response Validation:** A response validation interceptor was implemented to ensure response DTOs match the defined structure. See @ValidateResponse() decorator

_Note: Current implementation is only focusing on task-related control._

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
