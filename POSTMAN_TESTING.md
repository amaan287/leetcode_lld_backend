# Postman API Testing Guide

This document provides instructions for testing the DSA & LLD Learning Platform API using Postman.

## Import Collection

1. Open Postman
2. Click **Import** button
3. Select the `postman_collection.json` file
4. The collection will be imported with all endpoints organized by category

## Setup

### 1. Configure Base URL

The collection uses a variable `base_url` which defaults to `http://localhost:3001`. You can change this in:
- Collection Variables (click on collection → Variables tab)
- Or update it in individual requests

### 2. Authentication Flow

1. **Register a new user** or **Login** with existing credentials
2. The auth token will be automatically saved to the `auth_token` collection variable
3. All protected endpoints will use this token automatically

## Endpoints Overview

### Health Check
- `GET /health` - Check if server is running

### Authentication (No Auth Required)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/google` - Google OAuth authentication

### DSA Endpoints

#### Public Routes
- `GET /api/dsa/lists/public` - Get all public lists

#### Protected Routes (Require Auth Token)
- `POST /api/dsa/search/company` - Search problems by company
- `POST /api/dsa/lists` - Create a new list
- `GET /api/dsa/lists` - Get user's lists
- `GET /api/dsa/lists/:id` - Get list with problems
- `PUT /api/dsa/lists/:id` - Update list
- `DELETE /api/dsa/lists/:id` - Delete list
- `POST /api/dsa/lists/:id/problems` - Add problem to list
- `DELETE /api/dsa/lists/:id/problems/:problemId` - Remove problem from list
- `POST /api/dsa/lists/:id/problems/:problemId/toggle` - Toggle problem completion status

### LLD Endpoints

#### Public Routes
- `GET /api/lld/questions` - Get all questions (with optional filters)
- `GET /api/lld/questions/:id` - Get question by ID

#### Protected Routes (Require Auth Token)
- `POST /api/lld/questions/:id/rate` - Submit answer for AI rating
- `GET /api/lld/answers` - Get user's submitted answers

## Example Request Bodies

### Register User
```json
{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

### Login
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

### Create DSA List
```json
{
  "name": "My DSA List",
  "isPublic": false
}
```

### Update List
```json
{
  "name": "Updated List Name",
  "isPublic": true
}
```

### Add Problem to List
```json
{
  "problemId": "PROBLEM_ID_HERE"
}
```

### Toggle Problem Status
```json
{
  "isCompleted": true
}
```

### Search by Company
```json
{
  "companyName": "Google",
  "role": "SDE"
}
```

### Submit LLD Answer
```json
{
  "answer": "Here is my solution:\n\n1. I would create a ParkingLot class with slots\n2. Each slot can have a vehicle or be empty\n3. I would use a HashMap to track vehicle positions\n4. Methods: park(), unpark(), findAvailableSlot()\n5. Handle edge cases like full parking lot"
}
```

## Testing Workflow

### 1. Start the Backend Server
```bash
cd backend
bun run dev
```

### 2. Test Authentication
1. Use **Register** endpoint to create a new user
2. Or use **Login** endpoint with existing credentials
3. Token will be automatically saved

### 3. Test DSA Features
1. Create a list using **Create List**
2. Search for problems using **Search by Company**
3. Add problems to your list using **Add Problem to List**
4. Toggle problem status using **Toggle Problem Status**
5. View your list using **Get List by ID**

### 4. Test LLD Features
1. Get questions using **Get All Questions**
2. View a specific question using **Get Question by ID**
3. Submit an answer using **Submit Answer for Rating**
4. View your answers using **Get My Answers**

## Response Examples

### Successful Registration/Login
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "test@example.com",
    "name": "Test User"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email address"
  }
}
```

### List Response
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "name": "My DSA List",
  "isPublic": false,
  "problemIds": ["507f1f77bcf86cd799439013"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### LLD Answer with Rating
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "questionId": "507f1f77bcf86cd799439013",
  "answer": "Here is my solution...",
  "rating": 8,
  "feedback": "Good solution! Consider adding error handling...",
  "submittedAt": "2024-01-01T00:00:00.000Z"
}
```

## Notes

- Replace `LIST_ID_HERE`, `PROBLEM_ID_HERE`, and `QUESTION_ID_HERE` with actual IDs from your database
- The auth token expires after 7 days - re-login if you get 401 errors
- All protected endpoints require the `Authorization: Bearer <token>` header
- The collection automatically saves the token after successful login/register

## Troubleshooting

### 401 Unauthorized
- Make sure you've logged in and the token is saved
- Check that the `Authorization` header is set correctly
- Token may have expired - try logging in again

### 404 Not Found
- Verify the endpoint URL is correct
- Check that the server is running on the correct port
- Ensure the resource ID exists in the database

### 500 Internal Server Error
- Check server logs for detailed error messages
- Verify environment variables are set correctly
- Ensure MongoDB connection is working

