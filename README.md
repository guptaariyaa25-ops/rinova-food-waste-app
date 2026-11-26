# Rinova: Managing Leftover Food Wastage

*Every meal deserves a second chance.*

Rinova is a simple web app that helps people with leftover food (restaurants, hostels, homes) reach people who need it, before the food expires. It was built as a TCS iON Industry Project.

The name comes from the Italian *rinnovare*, "to renew".

## Features
- Donors post leftover food with quantity, expiry time and location
- Receivers view available food and request it
- Coordinators approve or reject requests and mark food as collected
- Food status flow: Available, Requested, Collected
- Expired food is hidden from Available and cannot be approved
- Input checks and role rules are enforced on the server

## Roles
| Role | What they can do |
|------|------------------|
| Donor | Add, edit and delete their own Available listings |
| Receiver | View Available food and request it |
| Coordinator | Approve or reject requests, mark food as Collected |

There is no password login in this version. Choose a user from the dropdown at the top right.

## Tech stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js with Express (REST API)
- Database: SQLite (better-sqlite3, file `food.db`)
- Testing: browser tests and Postman, results in Excel

## How to run
1. Install Node.js (LTS version) from https://nodejs.org
2. Open a terminal in the project folder.
3. Install the packages by running `npm install`
4. Start the server by running `node server.js`
5. Open http://localhost:3000 in a browser.

## Pages
- **Home**: counts of Available, Requested and Collected food
- **Add Food**: form for donors (also used for editing)
- **View Food**: table with filters and role-based buttons
- **Coordinator**: Pending, Approved and History tables

## API endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/users | List users |
| POST | /api/food | Add food (Donor only) |
| GET | /api/food | View food (optional ?status=) |
| GET | /api/food/:id | View one listing |
| PUT | /api/food/:id | Edit own listing (Donor) |
| DELETE | /api/food/:id | Delete own Available listing (Donor) |
| POST | /api/requests | Request food (Receiver) |
| GET | /api/requests | List requests |
| PUT | /api/requests/:id | Approve or reject (Coordinator) |
| PUT | /api/food/:id/status | Mark Collected (Coordinator) |

## Testing
34 test cases were run in the browser and in Postman. 31 passed in the first run, and the 3 that failed (TC_09, TC_19, TC_24) passed on retest. 10 items were logged in the defect log and all are closed. Screenshots are in `docs/screenshots`.

## Future scope
Real login, SMS or WhatsApp alerts, maps and distance filter, food photos, and a server database for many users.

## Author
Riya Gupta. TCS iON Industry Project, November 2026.
