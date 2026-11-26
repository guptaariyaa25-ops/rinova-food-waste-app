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
1. Install [Node.js](https://nodejs.org) (LTS version).
2. Open a terminal in the project folder.
3. Install the packages:
